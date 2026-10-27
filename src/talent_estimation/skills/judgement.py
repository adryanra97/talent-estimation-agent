"""Skills that need judgement.

Each skill calls a language model when a client is given. Without a client it
falls back to a transparent rule-based judge, which powers the demo mode and
the tests and serves as a baseline in evaluation.
"""

from __future__ import annotations

import asyncio
import re
from collections.abc import Iterable
from datetime import date

from talent_estimation.catalog.loader import Catalog
from talent_estimation.domain.models import (
    EF_FACTORS,
    TCF_FACTORS,
    Actor,
    AiTask,
    BreakdownRow,
    CapabilityNeed,
    Classification,
    Finding,
    RoleFactors,
    RunResult,
    WbsItem,
)
from talent_estimation.llm.client import LLMClient
from talent_estimation.skills import prompts
from talent_estimation.skills.schemas import (
    AiAssistBatch,
    CapabilityJudgement,
    ClassificationBatch,
    FactorAssessment,
    ItemJudgement,
    MessageDraft,
    QualityReview,
    RequestedRole,
    RequestExtraction,
    RoleJudgement,
    RowTasks,
    TaskJudgement,
)

BATCH_SIZE = 12
"""Number of WBS items classified per model call."""

DEFAULT_ALLOCATION: dict[tuple[str, str], float] = {
    ("Utama", "Simple"): 0.4,
    ("Utama", "Average"): 0.6,
    ("Utama", "Complex"): 1.0,
}
SUPPORT_ALLOCATION = 0.15


# --------------------------------------------------------------------- helpers
def classification_from_steps(steps: int) -> Classification:
    """Return the initial class from the number of steps (rule R8).

    Examples
    --------
    >>> classification_from_steps(4)
    'Average'
    """
    if steps <= 3:
        return "Simple"
    if steps <= 7:
        return "Average"
    return "Complex"


def count_steps(text: str) -> int:
    """Count work steps listed in an item description."""
    parts = [p for p in re.split(r",|&|;|/|\bdan\b|\band\b|\+", text) if p.strip()]
    return max(1, len(parts))


def expand_hint(hint: str, legend: dict[str, str]) -> str:
    """Append role titles to role codes using the legend found in the workbook.

    Examples
    --------
    >>> expand_hint("DE1, BA", {"DE1": "Data Engineer"})
    'DE1 (Data Engineer), BA'
    """
    tokens = [t.strip() for t in re.split(r"[,;]", hint) if t.strip()]
    return ", ".join(f"{t} ({legend[t]})" if t in legend else t for t in tokens)


def _keywords(text: str) -> list[str]:
    phrases = re.split(r",|;|\batau\b|\bdan\b|\(|\)", text.lower())
    return [p.strip(" .") for p in phrases if len(p.strip(" .")) >= 3]


def _keyword_score(text: str, keywords: Iterable[str]) -> int:
    lowered = text.lower()
    score = 0
    for k in keywords:
        if not k:
            continue
        if len(k) <= 4:
            score += bool(re.search(rf"\b{re.escape(k)}\b", lowered))
        else:
            score += k in lowered
    return score


def _item_line(item: WbsItem, legend: dict[str, str]) -> str:
    period = (
        f"{item.start:%d %b %Y} s.d. {item.end:%d %b %Y}"
        if item.start and item.end
        else "tidak ada"
    )
    workdays = f"{item.workdays:g} hari kerja" if item.workdays is not None else "hari kerja kosong"
    return (
        f"- [{item.item_id}] {item.name} | deskripsi: {item.description or '-'} | "
        f"role di WBS: {expand_hint(item.role_hint, legend) or '-'} | periode: {period} "
        f"({workdays}) | kelompok: {item.group or '-'}"
    )


MAX_CAPABILITIES = 3
"""Skills kept per breakdown row."""

_LEVEL_FROM_CLASS = {"Simple": 2, "Average": 3, "Complex": 4}
_DEEP_WORK = (
    "forecasting",
    "anomaly",
    "rag",
    "orchestration",
    "streaming",
    "real-time",
    "multi-agent",
    "halusinasi",
    "tuning",
    "design system",
)
"""Words that suggest deeper expertise, used only by the rule-based judge."""


def _capabilities(j: RoleJudgement, catalog: Catalog | None) -> list[CapabilityNeed]:
    """Keep only skills listed for the role in the catalog, at most three."""
    needs: list[CapabilityNeed] = []
    seen: set[str] = set()
    for cap in j.capabilities:
        match = catalog.find_skill(j.role, cap.skill, cap.pillar) if catalog else None
        if match is None or match[1] in seen:
            continue
        seen.add(match[1])
        needs.append(
            CapabilityNeed(
                pillar=match[0],
                skill=match[1],
                level=min(5, max(1, cap.level)),
                reason=cap.reason,
            )
        )
    return needs[:MAX_CAPABILITIES]


def _heuristic_capabilities(
    text: str, role: str, catalog: Catalog, classification: str, involvement: str
) -> list[CapabilityJudgement]:
    """Pick skills whose words appear in the item, with a level from its class."""
    profile = catalog.roles[role]
    words = _words(text)
    scored = []
    for order, (pillar, skills) in enumerate(profile.pillars.items()):
        for skill in skills:
            overlap = len(words & _words(f"{pillar} {skill}"))
            if overlap:
                scored.append((overlap, -order, pillar, skill))
    scored.sort(reverse=True)
    if not scored and profile.pillars:
        pillar, skills = next(iter(profile.pillars.items()))
        scored = [(0, 0, pillar, skills[0])] if skills else []
    deep = any(re.search(rf"\b{re.escape(w)}\b", text.lower()) for w in _DEEP_WORK)
    level = (
        _LEVEL_FROM_CLASS.get(classification, 3)
        + (1 if deep else 0)
        - (1 if involvement == "Pendukung" else 0)
    )
    return [
        CapabilityJudgement(
            pillar=pillar,
            skill=skill,
            level=min(5, max(1, level)),
            reason=f"Diturunkan dari kelas {classification} dan kata kunci item.",
        )
        for _, _, pillar, skill in scored[:2]
    ]


def _row_from(item: WbsItem, j: RoleJudgement, catalog: Catalog | None = None) -> BreakdownRow:
    needs_review = j.needs_review or item.workdays is None or item.start is None
    return BreakdownRow(
        item_id=item.item_id,
        item_name=item.name,
        description=item.description,
        role_hint=item.role_hint,
        start=item.start,
        end=item.end,
        workdays=item.workdays,
        group=item.group,
        role=j.role,
        involvement=j.involvement,
        quantity=j.quantity,
        steps=j.steps,
        classification=j.classification,
        classification_reason=j.classification_reason,
        allocation_fte=j.allocation_fte,
        allocation_reason=j.allocation_reason,
        needs_review=needs_review,
        source=item.source,
        capabilities=_capabilities(j, catalog),
    )


# --------------------------------------------------------------- parse request
def _heuristic_request(text: str, catalog: Catalog, roles: list[str]) -> RequestExtraction:
    requested: list[RequestedRole] = []
    lowered = text.lower()
    for code in roles:
        role = catalog.roles[code]
        for alias in sorted({role.name.lower(), *role.aliases}, key=len, reverse=True):
            if len(alias) < 4:
                continue
            match = re.search(
                rf"(\d+(?:[.,]\d+)?)\s*(?:orang|org|fte)?\s*{re.escape(alias)}", lowered
            ) or re.search(rf"{re.escape(alias)}\s*[:=(]?\s*(\d+(?:[.,]\d+)?)", lowered)
            if match:
                value = float(match.group(1).replace(",", "."))
                requested.append(RequestedRole(role=code, fte=value, evidence=match.group(0)))
                break
    return RequestExtraction(
        requested=requested, notes="Dibaca dengan aturan sederhana (tanpa model)."
    )


async def parse_request(
    text: str, catalog: Catalog, roles: list[str], llm: LLMClient | None
) -> RequestExtraction:
    """Read requested FTE per role and the project period from a request document.

    Parameters
    ----------
    text : str
        Text of the request document.
    catalog : Catalog
        Capability catalog.
    roles : list of str
        Role codes in scope.
    llm : LLMClient or None
        Model client. ``None`` uses the rule-based reader.

    Returns
    -------
    RequestExtraction
        Requested roles, period, and notes. Roles outside the scope are dropped.
    """
    if not text.strip():
        return RequestExtraction()
    if llm is None:
        return _heuristic_request(text, catalog, roles)
    role_list = ", ".join(f"{c} ({catalog.roles[c].name})" for c in roles)
    result = await llm.structured(
        RequestExtraction,
        prompts.BASE_SYSTEM,
        prompts.PARSE_REQUEST.format(roles=role_list, text=text),
        skill="parse_request",
    )
    result.requested = [r for r in result.requested if r.role in roles]
    return result


# -------------------------------------------------------------- classify items
def _heuristic_item(
    item: WbsItem, catalog: Catalog, roles: list[str], legend: dict[str, str]
) -> ItemJudgement:
    text = f"{item.name} {item.description}"
    hinted = set(catalog.match_role(expand_hint(item.role_hint, legend)))
    judgements: list[RoleJudgement] = []
    steps = count_steps(item.description or item.name)
    classification = classification_from_steps(steps)
    for code in roles:
        role = catalog.roles[code]
        score = _keyword_score(text, _keywords(role.primary_keywords))
        support = _keyword_score(text, _keywords(role.usually_supporting_on))
        if code in hinted:
            only_role = hinted & set(roles) == {code}
            involvement = "Utama" if score > 0 or only_role else "Pendukung"
            review = False
        elif score >= 2:
            involvement, review = "Utama", True
        else:
            continue
        if involvement == "Pendukung" and support == 0 and score == 0 and not hinted:
            continue
        allocation = (
            DEFAULT_ALLOCATION[(involvement, classification)]
            if involvement == "Utama"
            else SUPPORT_ALLOCATION
        )
        why_role = (
            f"Isi pekerjaan cocok dengan lingkup utama {role.name}."
            if involvement == "Utama"
            else f"{role.name} memberi input atau review; inti pekerjaan ada pada role lain."
        )
        if review:
            why_role += " Role tidak disebut di WBS (potensi gap)."
        judgements.append(
            RoleJudgement(
                role=code,
                involvement=involvement,
                steps=steps,
                classification=classification,
                classification_reason=f"{steps} butir pekerjaan pada deskripsi, kelas {classification}. {why_role}",
                allocation_fte=allocation,
                allocation_reason=f"Nilai tengah panduan alokasi untuk {involvement} {classification}.",
                needs_review=review,
                capabilities=_heuristic_capabilities(
                    text, code, catalog, classification, involvement
                ),
            )
        )
    return ItemJudgement(item_id=item.item_id, roles=judgements)


async def classify_items(
    items: list[WbsItem],
    catalog: Catalog,
    roles: list[str],
    context: str,
    llm: LLMClient | None,
    legend: dict[str, str] | None = None,
    feedback: str = "",
) -> list[BreakdownRow]:
    """Decide which roles each item needs, their class, and their allocation.

    Items are sent to the model in batches that run concurrently.

    Parameters
    ----------
    items : list of WbsItem
        Leaf work packages.
    catalog : Catalog
        Capability catalog.
    roles : list of str
        Role codes in scope.
    context : str
        Free project context written by the user and read from documents.
    llm : LLMClient or None
        Model client. ``None`` uses the rule-based judge.
    legend : dict, optional
        Role code legend read from the workbook.
    feedback : str, optional
        Reviewer feedback for a reclassification round.

    Returns
    -------
    list of BreakdownRow
        One row per item and role. Roles outside the scope are dropped.
    """
    legend = legend or {}
    by_id = {i.item_id: i for i in items}
    if llm is None:
        judgements = [_heuristic_item(i, catalog, roles, legend) for i in items]
    else:
        batches = [items[i : i + BATCH_SIZE] for i in range(0, len(items), BATCH_SIZE)]

        async def run_batch(batch: list[WbsItem]) -> list[ItemJudgement]:
            prompt = prompts.CLASSIFY.format(
                catalog=prompts.catalog_block(catalog, roles),
                context=context or "-",
                feedback=f"\nCATATAN REVIEWER UNTUK DINILAI ULANG:\n{feedback}\n"
                if feedback
                else "",
                items="\n".join(_item_line(i, legend) for i in batch),
                levels="\n".join(f"{k}: {v}" for k, v in sorted(catalog.capability_levels.items())),
            )
            result = await llm.structured(
                ClassificationBatch, prompts.BASE_SYSTEM, prompt, skill="classify_item"
            )
            return result.items

        results = await asyncio.gather(*(run_batch(b) for b in batches))
        judgements = [j for batch in results for j in batch]
    rows: list[BreakdownRow] = []
    seen: set[str] = set()
    for judgement in judgements:
        item = by_id.get(judgement.item_id)
        if item is None:
            continue
        for role_judgement in judgement.roles:
            key = f"{item.item_id}|{role_judgement.role}"
            if role_judgement.role not in roles or key in seen:
                continue
            seen.add(key)
            rows.append(_row_from(item, role_judgement, catalog))
    order = {i.item_id: n for n, i in enumerate(items)}
    rows.sort(key=lambda r: (order.get(r.item_id, 0), roles.index(r.role)))
    return rows


# --------------------------------------------------------------- UCP factors
async def assess_factors(
    role: str,
    rows: list[BreakdownRow],
    catalog: Catalog,
    context: str,
    llm: LLMClient | None,
) -> RoleFactors:
    """Identify UCP actors and evidence-backed factor ratings for one role.

    Returns
    -------
    RoleFactors
        Actors and ratings. Ratings without evidence stay at 3.
    """
    if not rows:
        return RoleFactors(role=role)
    if llm is None:
        groups = {r.group for r in rows if r.group}
        return RoleFactors(
            role=role,
            actors=[
                Actor(
                    name="Sumber data dan sistem terkait",
                    category="Average",
                    count=max(1, min(len(groups), 6)),
                    source="Kelompok item WBS",
                ),
                Actor(
                    name="Pengguna dan stakeholder proyek",
                    category="Complex",
                    count=1,
                    source="Asumsi",
                ),
            ],
        )
    factor_text = "\n".join(f"   {c}: {n} (bobot {w:g})" for c, n, w in TCF_FACTORS + EF_FACTORS)
    rubric = "\n".join(f"   - {k}: {v}" for k, v in catalog.actor_rubric.items())
    lines = "\n".join(
        f"- [{r.item_id}] {r.item_name} ({r.involvement}, {r.classification}): {r.description}"
        for r in rows
    )
    result = await llm.structured(
        FactorAssessment,
        prompts.BASE_SYSTEM,
        prompts.FACTORS.format(
            catalog=prompts.catalog_block(catalog, [role]),
            context=context or "-",
            role=f"{role} ({catalog.roles[role].name})",
            rows=lines,
            actor_rubric=rubric,
            factors=factor_text,
        ),
        skill="assess_factors",
    )
    valid = {c for c, _, _ in TCF_FACTORS + EF_FACTORS}
    ratings = {c.code: c.rating for c in result.rating_changes if c.code in valid and c.evidence}
    evidence = {c.code: c.evidence for c in result.rating_changes if c.code in ratings}
    return RoleFactors(
        role=role,
        actors=[Actor(**a.model_dump()) for a in result.actors[:12]],
        ratings=ratings,
        evidence=evidence,
    )


# ------------------------------------------------------------------ reconcile
def reconcile(
    run: RunResult, ucp_days: dict[str, float], low: float = 0.5, high: float = 2.0, limit: int = 10
) -> tuple[list[tuple[BreakdownRow, float]], list[Finding]]:
    """Compare both methods per row and per role.

    Parameters
    ----------
    run : RunResult
        Recalculated run.
    ucp_days : dict
        UCP person-days per row key.
    low, high : float, optional
        Ratio bounds of UCP to bottom-up person-days outside which a row is a
        candidate for review.
    limit : int, optional
        Maximum number of candidates.

    Returns
    -------
    tuple
        Candidate rows with their ratio, and divergence findings per role.
    """
    from talent_estimation.calc.engine import bottom_up_person_days, outside_period

    candidates: list[tuple[BreakdownRow, float]] = []
    for row in run.breakdown:
        bu = bottom_up_person_days(row)
        ucp = ucp_days.get(row.key, 0.0)
        if bu <= 0 or ucp <= 0:
            continue
        ratio = ucp / bu
        if ratio < low or ratio > high:
            candidates.append((row, ratio))
    candidates.sort(key=lambda c: abs(c[1] - 1), reverse=True)
    findings = [
        Finding(
            kind="divergence",
            role=c.role,
            message=(
                f"UCP {c.ucp_fte:.2f} FTE dan bottom-up {c.bu_fte:.2f} FTE berbeda "
                f"{c.divergence:+.0%}, di atas toleransi {run.parameters.tolerance:.0%}."
            ),
            severity="Sedang",
            source="Reconciler",
        )
        for c in run.comparisons
        if c.divergence is not None and abs(c.divergence) > run.parameters.tolerance
    ]
    for row in run.breakdown:
        top = max((c.level for c in row.capabilities), default=None)
        if top is None:
            continue
        if (row.classification == "Simple" and top >= 5) or (
            row.classification == "Complex" and top <= 1
        ):
            findings.append(
                Finding(
                    kind="capability",
                    item_id=row.item_id,
                    role=row.role,
                    message=(
                        f"Kelas {row.classification} tetapi level capability tertinggi {top}. "
                        "Periksa apakah kelas atau levelnya yang perlu disesuaikan."
                    ),
                    severity="Rendah",
                    source="Reconciler",
                )
            )
    outside = outside_period(run)
    if outside:
        items = sorted({r.item_id for r, _ in outside})
        shown = ", ".join(items[:8]) + (f" dan {len(items) - 8} lainnya" if len(items) > 8 else "")
        findings.append(
            Finding(
                kind="data_quality",
                message=(
                    f"{len(items)} item punya hari kerja di luar periode analisis "
                    f"{run.project.start:%d %b %Y} s.d. {run.project.end:%d %b %Y} ({shown}). "
                    "Effort-nya tetap masuk FTE rata-rata, tetapi tidak tampil di sebaran "
                    "bulanan dan FTE puncak. Periksa periode proyek."
                ),
                severity="Tinggi",
                source="Reconciler",
            )
        )
    return candidates[:limit], findings


# ------------------------------------------------------------- quality check
_GENERIC_WORDS = {"data", "analisis", "layanan", "sistem", "proyek"}
_SHARED = ("seluruh", "semua", "bersama", "shared", "lintas", "all use case")


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]{4,}", text.lower())}


def _heuristic_quality(run: RunResult) -> QualityReview:
    from talent_estimation.skills.schemas import FindingDraft

    findings: list[FindingDraft] = []
    for row in run.breakdown:
        if row.needs_review and "potensi gap" in row.classification_reason.lower():
            findings.append(
                FindingDraft(
                    kind="gap",
                    item_id=row.item_id,
                    role=row.role,
                    message=f"Isi pekerjaan '{row.item_name}' cocok dengan lingkup {row.role}, "
                    "tetapi role ini tidak disebut di WBS.",
                )
            )
    primary = [r for r in run.breakdown if r.involvement == "Utama" and r.start and r.end]
    for i, a in enumerate(primary):
        for b in primary[i + 1 :]:
            if a.role != b.role or a.group == b.group or a.item_id == b.item_id:
                continue
            common = (_words(a.item_name) & _words(b.item_name)) - _GENERIC_WORDS
            shared = any(
                m in f"{x.item_name} {x.description}".lower() for x in (a, b) for m in _SHARED
            )
            if not common or not shared:
                continue
            if a.start <= b.end and b.start <= a.end:  # type: ignore[operator]
                findings.append(
                    FindingDraft(
                        kind="overlap",
                        item_id=b.item_id,
                        role=b.role,
                        message=f"'{b.item_name}' ({b.item_id}) mirip dengan '{a.item_name}' "
                        f"({a.item_id}) dan periodenya beririsan. Pastikan tidak dihitung ganda.",
                    )
                )
                break
    return QualityReview(findings=findings[:20])


async def check_quality(
    run: RunResult,
    candidates: list[tuple[BreakdownRow, float]],
    catalog: Catalog,
    documents: str,
    llm: LLMClient | None,
) -> QualityReview:
    """Review the breakdown, send doubtful rows back, and look for missing work.

    Returns
    -------
    QualityReview
        Findings, rows to reclassify, and additional items proposed from
        supporting documents.
    """
    if llm is None:
        return _heuristic_quality(run)
    lines = "\n".join(
        f"- [{r.item_id}] {r.role} {r.involvement} {r.classification} alokasi {r.allocation_fte:g} "
        f"| {r.item_name}: {r.description} | {r.start} s.d. {r.end} | review={r.needs_review}"
        for r in run.breakdown
    )
    cand = (
        "\n".join(
            f"- [{r.item_id}] {r.role}: rasio UCP/bottom-up {ratio:.2f} ({r.classification}, "
            f"alokasi {r.allocation_fte:g}, {r.workdays} hari kerja)"
            for r, ratio in candidates
        )
        or "- (tidak ada kandidat)"
    )
    result = await llm.structured(
        QualityReview,
        prompts.BASE_SYSTEM,
        prompts.QUALITY.format(
            catalog=prompts.catalog_block(catalog, run.roles),
            context=run.project.context or "-",
            candidates=cand,
            rows=lines,
            documents=documents or "-",
        ),
        skill="check_quality",
    )
    keys = {r.key for r in run.breakdown}
    result.reclassify = [r for r in result.reclassify if f"{r.item_id}|{r.role}" in keys]
    result.additional_items = [a for a in result.additional_items if a.role in run.roles]
    return result


# --------------------------------------------------------------- AI assistance
_TEMPLATES: dict[str, list[tuple[str, float, str, str, str]]] = {
    "DE": [
        ("Penulisan script pipeline dan transformasi", 0.4, "routine_code", "ETL/ELT & Orchestration", "Desain Pipeline Idempoten & Fault-Tolerant"),
        ("Validasi data dan unit test pipeline", 0.25, "test_generation", "Data Quality & Testing", "Pipeline Unit Testing"),
        ("Dokumentasi mapping dan pipeline", 0.15, "documentation", "Security, Gov & Compliance", "Data Governance & Catalog"),
        ("Koordinasi dengan pemilik sumber data", 0.2, "judgment", "", ""),
    ],
    "DA": [
        ("Query dan agregasi KPI", 0.35, "routine_code", "Querying & Transformation", "Advanced SQL Execution"),
        ("Eksplorasi dan profiling data", 0.2, "exploration", "Exploratory Analytics", "Exploratory Data Analysis"),
        ("Dokumentasi definisi KPI", 0.15, "documentation", "Business Translation", "KPI Framework Definition"),
        ("Validasi bisnis bersama pengguna", 0.3, "judgment", "Business Translation", "Stakeholder & Executive Communication"),
    ],
    "DS": [
        ("Eksplorasi data dan rekayasa fitur", 0.25, "exploration", "Classic ML & Modeling", "Feature Engineering & Selection"),
        ("Kode eksperimen dan model", 0.3, "routine_code", "Classic ML & Modeling", "Supervised Learning"),
        ("Evaluasi dan laporan model", 0.2, "text_analysis", "Analytics & Storytelling", "Translating Technical Concepts"),
        ("Desain pendekatan analitik", 0.25, "judgment", "Experimentation & Causal", "Experiment Design & Stratification"),
    ],
    "AI": [
        ("Penyusunan dan iterasi prompt", 0.3, "routine_code", "LLM & Prompting", "Prompt Engineering"),
        ("Integrasi layanan AI", 0.25, "routine_code", "Data & Infrastructure", "API Development & Integration"),
        ("Evaluasi keluaran AI", 0.25, "test_generation", "ML Lifecycle", "Evaluation & Validation"),
        ("Desain alur dan keputusan arsitektur", 0.2, "judgment", "Agents", "Multi-Agent Orchestration"),
    ],
    "UXR": [
        ("Penyusunan rencana dan panduan riset", 0.15, "documentation", "Research Planning", "Method Selection"),
        ("Sesi wawancara dan uji dengan pengguna", 0.4, "judgment", "Qualitative Methods", "User Interview"),
        ("Transkrip, ringkasan, dan sintesis temuan", 0.3, "text_analysis", "Synthesis & Communication", "Affinity Mapping"),
        ("Laporan insight dan rekomendasi", 0.15, "documentation", "Synthesis & Communication", "Insight Reporting"),
    ],
    "UX": [
        ("Struktur informasi dan user flow", 0.3, "judgment", "Interaction Design", "User & Task Flow"),
        ("Wireframe dan variasi tata letak", 0.3, "design_variation", "Wireframing & Prototyping", "Wireframing"),
        ("Prototipe interaktif", 0.25, "design_variation", "Wireframing & Prototyping", "Interactive Prototyping"),
        ("Microcopy dan label", 0.15, "documentation", "UX Writing", "Microcopy"),
    ],
    "UI": [
        ("Eksplorasi gaya visual dan arah desain", 0.25, "judgment", "Visual Design", "Visual Hierarchy"),
        ("Mockup layar dan state", 0.4, "design_variation", "Mockup & Responsive", "High-Fidelity Mockup"),
        ("Ikon, ilustrasi, dan aset", 0.15, "design_variation", "Handoff & QA", "Asset Preparation"),
        ("Dokumentasi komponen dan handoff", 0.2, "documentation", "Design System", "Usage Documentation"),
    ],
}  # fmt: skip
_SUPPORT_TEMPLATE = [
    ("Review dan validasi", 0.7, "judgment", "", ""),
    ("Catatan review dan dokumentasi", 0.3, "documentation", "", ""),
]


def _to_tasks(row_tasks: RowTasks, catalog: Catalog, tools: str) -> list[AiTask]:
    tasks = [t for t in row_tasks.tasks if catalog.ai_category(t.category) is not None]
    total = sum(t.weight for t in tasks)
    result: list[AiTask] = []
    for t in tasks:
        category = catalog.ai_category(t.category)
        assert category is not None
        result.append(
            AiTask(
                item_id=row_tasks.item_id,
                role=row_tasks.role,
                task=t.task,
                weight=t.weight / total if total else 0.0,
                pillar=t.pillar,
                skill=t.skill,
                category=t.category,
                saving=category.default_saving,
                confidence=t.confidence,
                prerequisite=t.prerequisite or (f"Tool AI tersedia: {tools}" if tools else ""),
                reason=t.reason,
            )
        )
    return result


async def assess_ai_assist(
    rows: list[BreakdownRow],
    catalog: Catalog,
    tools: list[str],
    llm: LLMClient | None,
) -> list[AiTask]:
    """Split each row into tasks and choose a closed AI assistance category.

    Saving percentages come from the category table, never from the model.

    Returns
    -------
    list of AiTask
        Tasks with normalised weights and default savings.
    """
    tool_text = ", ".join(tools)
    if llm is None:
        result: list[AiTask] = []
        for row in rows:
            template = _TEMPLATES.get(row.role) if row.involvement == "Utama" else _SUPPORT_TEMPLATE
            template = template or _SUPPORT_TEMPLATE
            row_tasks = RowTasks(
                item_id=row.item_id,
                role=row.role,
                tasks=[
                    TaskJudgement(
                        task=t,
                        weight=w,
                        category=c,
                        pillar=p,
                        skill=s,
                        confidence="Sedang",
                        reason="Templat tugas bawaan untuk role dan peran ini.",
                    )
                    for t, w, c, p, s in template
                ],
            )
            result.extend(_to_tasks(row_tasks, catalog, tool_text))
        return result
    categories = "\n".join(
        f"- {c.key}: {c.label} (contoh: {c.examples})" for c in catalog.ai_categories
    )
    roles = sorted({r.role for r in rows})
    batches = [rows[i : i + BATCH_SIZE] for i in range(0, len(rows), BATCH_SIZE)]

    async def run_batch(batch: list[BreakdownRow]) -> list[RowTasks]:
        lines = "\n".join(
            f"- [{r.item_id}] role {r.role} ({r.involvement}): {r.item_name}. {r.description}"
            for r in batch
        )
        answer = await llm.structured(
            AiAssistBatch,
            prompts.BASE_SYSTEM,
            prompts.AI_ASSIST.format(
                catalog=prompts.catalog_block(catalog, roles),
                categories=categories,
                tools=tool_text or "belum ditentukan",
                rows=lines,
            ),
            skill="assess_ai_assist",
        )
        return answer.rows

    keys = {r.key for r in rows}
    gathered = await asyncio.gather(*(run_batch(b) for b in batches))
    tasks: list[AiTask] = []
    for batch in gathered:
        for row_tasks in batch:
            if f"{row_tasks.item_id}|{row_tasks.role}" in keys:
                tasks.extend(_to_tasks(row_tasks, catalog, tool_text))
    return tasks


# ------------------------------------------------------------------- message
def summary_text(run: RunResult, catalog: Catalog) -> str:
    """Return a factual summary of a run used for the reply draft."""
    lines = [f"Proyek: {run.project.name or '-'}"]
    if run.project.start and run.project.end:
        lines.append(f"Periode: {run.project.start:%d %b %Y} s.d. {run.project.end:%d %b %Y}")
    for c in run.comparisons:
        name = catalog.roles[c.role].name if c.role in catalog.roles else c.role
        requested = f"{c.requested_fte:g}" if c.requested_fte is not None else "tidak disebut"
        lines.append(
            f"- {name}: total UCP {c.ucp_fte:.2f} FTE, bottom-up {c.bu_fte:.2f} FTE; existing "
            f"{c.existing_fte:g}; tambahan {c.ucp_additional_fte:.2f}-{c.bu_additional_fte:.2f}; "
            f"diminta {requested}; {c.conclusion}."
        )
    important = [f for f in run.findings if f.severity == "Tinggi"] or run.findings
    for f in important[:5]:
        lines.append(f"- Temuan ({f.kind}): {f.message}")
    return "\n".join(lines)


async def draft_message(run: RunResult, catalog: Catalog, llm: LLMClient | None) -> str:
    """Draft the reply to the request from the calculated results."""
    summary = summary_text(run, catalog)
    if llm is None:
        body = "\n".join(line for line in summary.splitlines() if line.startswith("- "))
        return (
            "Terima kasih atas permintaan talent yang disampaikan. Berdasarkan WBS dan dokumen "
            "pendukung, kebutuhan dihitung dengan dua metode, Use Case Points dan bottom-up, "
            "sebagai berikut:\n\n"
            f"{body}\n\n"
            "Rincian per item WBS, asumsi, dan temuan terlampir pada file Excel. Mohon konfirmasi "
            "atas temuan yang ditandai perlu review sebelum alokasi talent ditetapkan."
        )
    result = await llm.structured(
        MessageDraft,
        prompts.BASE_SYSTEM,
        prompts.MESSAGE.format(summary=summary),
        skill="draft_message",
    )
    return result.text


def project_period(items: list[WbsItem]) -> tuple[date | None, date | None]:
    """Return the earliest start and latest end of the WBS items."""
    starts = [i.start for i in items if i.start]
    ends = [i.end for i in items if i.end]
    return (min(starts) if starts else None, max(ends) if ends else None)
