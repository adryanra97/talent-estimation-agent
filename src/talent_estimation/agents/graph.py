"""The agent graph: one orchestrator, four agents, and a report step.

The graph is compiled per request without a checkpointer, so nothing outlives
the request. Human review happens in the browser, which sends the run back
for recalculation or reclassification.

Flow::

    intake -> estimator -+-> reviewer <-> reclassify -+-> report
                         +-> augmentation (optional) -+
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any, TypedDict

from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field

from talent_estimation.calc.engine import recalculate, ucp_person_days_by_row
from talent_estimation.catalog.loader import Catalog
from talent_estimation.domain.models import (
    AiTask,
    BreakdownRow,
    Finding,
    Parameters,
    ProjectInfo,
    RoleInput,
    RunResult,
    TraceEvent,
    WbsItem,
)
from talent_estimation.llm.client import LLMClient
from talent_estimation.skills import judgement as skills
from talent_estimation.skills.schemas import ReclassifyRequest

MAX_REVIEW_ROUNDS = 2
"""Maximum number of times the reviewer may send rows back to the estimator."""


class RunInputs(BaseModel):
    """Everything a run needs, gathered by the API layer."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    project: ProjectInfo
    parameters: Parameters = Field(default_factory=Parameters)
    items: list[WbsItem]
    legend: dict[str, str] = Field(default_factory=dict)
    request_text: str = ""
    supporting_text: str = ""
    role_inputs: list[RoleInput] = Field(default_factory=list)
    ai_enabled: bool = True
    ai_tools: list[str] = Field(default_factory=list)
    catalog: Catalog


class GraphState(TypedDict, total=False):
    """State passed between nodes."""

    inputs: RunInputs
    run: RunResult
    review_round: int
    pending: list[ReclassifyRequest]
    ai_tasks: list[AiTask]


def _emit(agent: str, status: str, message: str, **extra: Any) -> None:
    writer = get_stream_writer()
    writer({"type": "progress", "agent": agent, "status": status, "message": message, **extra})


def _trace(run: RunResult, agent: str, action: str, detail: str = "") -> None:
    run.trace.append(TraceEvent(agent=agent, action=action, detail=detail))


def build_graph(llm: LLMClient | None):
    """Build and compile the agent graph.

    Parameters
    ----------
    llm : LLMClient or None
        Model client shared by all LLM skills. ``None`` runs the rule-based
        judge (demo mode).

    Returns
    -------
    langgraph.graph.state.CompiledStateGraph
        The compiled graph, without a checkpointer.
    """

    async def intake(state: GraphState) -> GraphState:
        inputs = state["inputs"]
        catalog = inputs.catalog
        roles = catalog.roles_for_scope(inputs.project.scope)
        _emit(
            "Intake Agent",
            "running",
            f"Membaca {len(inputs.items)} item WBS dan dokumen permintaan",
        )
        extraction = await skills.parse_request(inputs.request_text, catalog, roles, llm)
        wbs_start, wbs_end = skills.project_period(inputs.items)
        project = inputs.project.model_copy()
        project.start = project.start or extraction.period_start or wbs_start
        project.end = project.end or extraction.period_end or wbs_end
        project.name = project.name or extraction.project_name
        if extraction.notes:
            project.context = "\n".join(filter(None, [project.context, extraction.notes]))
        given = {r.role: r for r in inputs.role_inputs}
        extracted = {r.role: r.fte for r in extraction.requested}
        role_inputs = [
            RoleInput(
                role=code,
                requested_fte=(
                    given[code].requested_fte
                    if code in given and given[code].requested_fte is not None
                    else extracted.get(code)
                ),
                existing_fte=given[code].existing_fte if code in given else 0.0,
                reference_fte=given[code].reference_fte if code in given else None,
            )
            for code in roles
        ]
        run = RunResult(
            project=project,
            parameters=inputs.parameters,
            roles=roles,
            role_inputs=role_inputs,
            items=inputs.items,
            ai_enabled=inputs.ai_enabled,
        )
        found = ", ".join(f"{r.role} {r.fte:g}" for r in extraction.requested) or "tidak ada"
        _trace(run, "Intake Agent", "parse_wbs", f"{len(inputs.items)} item level terbawah")
        _trace(run, "Intake Agent", "parse_request", f"Permintaan terbaca: {found}")
        _emit(
            "Intake Agent",
            "done",
            f"Periode {project.start} s.d. {project.end}; permintaan: {found}",
        )
        return {"run": run, "review_round": 0, "pending": [], "ai_tasks": []}

    async def estimator(state: GraphState) -> GraphState:
        inputs, run = state["inputs"], state["run"]
        catalog = inputs.catalog
        _emit(
            "Estimator Agent", "running", "Menilai role, peran, klasifikasi, dan alokasi per item"
        )
        rows = await skills.classify_items(
            inputs.items, catalog, run.roles, run.project.context, llm, inputs.legend
        )
        _emit(
            "Estimator Agent",
            "running",
            f"{len(rows)} baris breakdown; menilai aktor dan faktor UCP",
        )
        factors = await asyncio.gather(
            *(
                skills.assess_factors(
                    role, [r for r in rows if r.role == role], catalog, run.project.context, llm
                )
                for role in run.roles
            )
        )
        run = recalculate(run.model_copy(update={"breakdown": rows, "factors": list(factors)}))
        _trace(run, "Estimator Agent", "classify_item", f"{len(rows)} baris item x role")
        _trace(run, "Estimator Agent", "ucp_calc + bu_calc", "Perhitungan oleh kode")
        _emit("Estimator Agent", "done", f"{len(rows)} baris dinilai dan dihitung")
        return {"run": run}

    async def reviewer(state: GraphState) -> GraphState:
        inputs, run = state["inputs"], recalculate(state["run"])
        round_no = state.get("review_round", 0)
        _emit("Reviewer Agent", "running", f"Memeriksa hasil (putaran {round_no + 1})")
        estimates = {e.role: e for e in run.estimates}
        ucp_days = ucp_person_days_by_row(run.breakdown, estimates, run.parameters)
        candidates, divergence = skills.reconcile(run, ucp_days)
        documents = "\n\n".join(
            filter(None, [inputs.request_text[:15000], inputs.supporting_text[:20000]])
        )
        review = await skills.check_quality(run, candidates, inputs.catalog, documents, llm)
        findings = [f for f in run.findings if f.kind != "divergence"]
        existing = {(f.kind, f.item_id, f.role, f.message) for f in findings}
        for draft in review.findings:
            key = (draft.kind, draft.item_id, draft.role, draft.message)
            if key not in existing:
                findings.append(Finding(**draft.model_dump(), source="Reviewer Agent"))
                existing.add(key)
        findings.extend(divergence)
        breakdown = list(run.breakdown)
        if round_no == 0:
            for n, extra in enumerate(review.additional_items, start=1):
                start = extra.start or run.project.start
                end = extra.end or run.project.end
                workdays = None
                if start and end:
                    from talent_estimation.calc.calendar import networkdays

                    workdays = float(networkdays(start, end, run.parameters.holidays))
                breakdown.append(
                    BreakdownRow(
                        item_id=f"TAMBAHAN-{n}",
                        item_name=extra.name,
                        description=extra.description,
                        start=start,
                        end=end,
                        workdays=workdays,
                        group="Di luar WBS",
                        role=extra.role,
                        involvement=extra.involvement,
                        steps=extra.steps,
                        classification=extra.classification,
                        classification_reason=extra.reason,
                        allocation_fte=extra.allocation_fte,
                        allocation_reason=f"Sumber: {extra.source}",
                        needs_review=True,
                        source="additional",
                    )
                )
                findings.append(
                    Finding(
                        kind="outside_wbs",
                        item_id=f"TAMBAHAN-{n}",
                        role=extra.role,
                        message=f"Pekerjaan '{extra.name}' ditemukan di dokumen tambahan dan "
                        "ditambahkan sebagai item di luar WBS.",
                        severity="Tinggi",
                        source=extra.source or "Dokumen tambahan",
                    )
                )
        flagged = {(f.item_id, f.role) for f in findings if f.kind in ("gap", "overlap")}
        breakdown = [
            r.model_copy(update={"needs_review": True}) if (r.item_id, r.role) in flagged else r
            for r in breakdown
        ]
        run = recalculate(run.model_copy(update={"breakdown": breakdown, "findings": findings}))
        pending = review.reclassify if round_no < MAX_REVIEW_ROUNDS else []
        _trace(
            run,
            "Reviewer Agent",
            "reconcile + check_quality",
            f"{len(candidates)} kandidat, {len(review.findings)} temuan, "
            f"{len(pending)} dikirim ulang ke Estimator",
        )
        _emit(
            "Reviewer Agent",
            "done" if not pending else "running",
            f"{len(findings)} temuan; {len(pending)} baris dinilai ulang",
        )
        return {"run": run, "pending": pending}

    def after_review(state: GraphState) -> str:
        if state.get("pending") and state.get("review_round", 0) < MAX_REVIEW_ROUNDS:
            return "reclassify"
        # Augmentation reads the reviewed breakdown, so its tasks match the final rows.
        return "augmentation" if state["inputs"].ai_enabled else "report"

    async def reclassify(state: GraphState) -> GraphState:
        inputs, run = state["inputs"], state["run"]
        pending = state.get("pending", [])
        _emit(
            "Estimator Agent",
            "running",
            f"Menilai ulang {len(pending)} baris atas permintaan Reviewer",
        )
        by_id = {i.item_id: i for i in run.items}
        items = [by_id[p.item_id] for p in pending if p.item_id in by_id]
        feedback = "\n".join(f"- [{p.item_id}] {p.role}: {p.reason}" for p in pending)
        new_rows = await skills.classify_items(
            items, inputs.catalog, run.roles, run.project.context, llm, inputs.legend, feedback
        )
        wanted = {f"{p.item_id}|{p.role}" for p in pending}
        replacement = {r.key: r for r in new_rows if r.key in wanted}
        breakdown: list[BreakdownRow] = []
        findings = list(run.findings)
        for row in run.breakdown:
            new = replacement.get(row.key)
            if new is None:
                breakdown.append(row)
                continue
            if (new.classification, new.allocation_fte) != (row.classification, row.allocation_fte):
                findings.append(
                    Finding(
                        kind="reclassified",
                        item_id=row.item_id,
                        role=row.role,
                        message=f"Dinilai ulang: {row.classification} {row.allocation_fte:g} FTE "
                        f"menjadi {new.classification} {new.allocation_fte:g} FTE.",
                        severity="Rendah",
                        source="Reviewer Agent",
                    )
                )
            breakdown.append(new)
        run = recalculate(run.model_copy(update={"breakdown": breakdown, "findings": findings}))
        _trace(run, "Estimator Agent", "reclassify", feedback)
        return {"run": run, "pending": [], "review_round": state.get("review_round", 0) + 1}

    async def augmentation(state: GraphState) -> GraphState:
        inputs, run = state["inputs"], state["run"]
        _emit("Augmentation Agent", "running", "Memetakan tugas yang dapat dibantu AI")
        tasks = await skills.assess_ai_assist(run.breakdown, inputs.catalog, inputs.ai_tools, llm)
        _emit("Augmentation Agent", "done", f"{len(tasks)} tugas dipetakan ke capability")
        return {"ai_tasks": tasks}

    async def report(state: GraphState) -> GraphState:
        inputs, run = state["inputs"], state["run"]
        _emit("Report", "running", "Menyusun ringkasan dan draf pesan")
        run = recalculate(run.model_copy(update={"ai_tasks": state.get("ai_tasks", [])}))
        if run.ai_enabled:
            _trace(
                run,
                "Augmentation Agent",
                "assess_ai_assist + calc_ai_savings",
                f"{len(run.ai_tasks)} tugas",
            )
        message = await skills.draft_message(run, inputs.catalog, llm)
        run = run.model_copy(update={"message_draft": message})
        _trace(run, "Report", "draft_message", "Draf pesan disusun")
        _emit("Report", "done", "Hasil siap direview")
        return {"run": run}

    graph = StateGraph(GraphState)
    graph.add_node("intake", intake)
    graph.add_node("estimator", estimator)
    graph.add_node("reviewer", reviewer)
    graph.add_node("reclassify", reclassify)
    graph.add_node("augmentation", augmentation)
    graph.add_node("report", report)
    graph.add_edge(START, "intake")
    graph.add_edge("intake", "estimator")
    graph.add_edge("estimator", "reviewer")
    graph.add_conditional_edges("reviewer", after_review, ["reclassify", "augmentation", "report"])
    graph.add_edge("reclassify", "reviewer")
    graph.add_edge("augmentation", "report")
    graph.add_edge("report", END)
    return graph.compile()


async def run_pipeline(inputs: RunInputs, llm: LLMClient | None) -> AsyncIterator[dict[str, Any]]:
    """Run the graph and yield progress events followed by the result.

    Parameters
    ----------
    inputs : RunInputs
        Run inputs.
    llm : LLMClient or None
        Model client, or ``None`` for the rule-based demo mode.

    Yields
    ------
    dict
        ``{"type": "progress", ...}`` events and a final
        ``{"type": "result", "run": {...}}`` event.
    """
    graph = build_graph(llm)
    final: RunResult | None = None
    async for mode, chunk in graph.astream(
        {"inputs": inputs}, stream_mode=["custom", "values"], config={"recursion_limit": 30}
    ):
        if mode == "custom":
            yield chunk
        elif mode == "values" and "run" in chunk:
            final = chunk["run"]
    if final is None:
        raise RuntimeError("Graph selesai tanpa hasil.")
    yield {"type": "result", "run": final.model_dump(mode="json")}


async def reclassify_rows(
    run: RunResult,
    requests: list[ReclassifyRequest],
    catalog: Catalog,
    llm: LLMClient | None,
    legend: dict[str, str] | None = None,
) -> RunResult:
    """Re-judge rows chosen by a human reviewer and recalculate.

    Parameters
    ----------
    run : RunResult
        Current run held by the browser.
    requests : list of ReclassifyRequest
        Rows to re-judge with the reviewer's comment.
    catalog : Catalog
        Capability catalog.
    llm : LLMClient or None
        Model client.
    legend : dict, optional
        Role code legend.

    Returns
    -------
    RunResult
        Run with the chosen rows replaced and every number recalculated.
    """
    by_id = {i.item_id: i for i in run.items}
    items = [by_id[r.item_id] for r in requests if r.item_id in by_id]
    feedback = "\n".join(f"- [{r.item_id}] {r.role}: {r.reason}" for r in requests)
    new_rows = await skills.classify_items(
        items, catalog, run.roles, run.project.context, llm, legend or {}, feedback
    )
    wanted = {f"{r.item_id}|{r.role}" for r in requests}
    replacement = {r.key: r for r in new_rows if r.key in wanted}
    breakdown = [replacement.get(r.key, r) for r in run.breakdown]
    run = run.model_copy(update={"breakdown": breakdown})
    run.trace.append(
        TraceEvent(agent="Estimator Agent", action="reclassify (manusia)", detail=feedback)
    )
    return recalculate(run)
