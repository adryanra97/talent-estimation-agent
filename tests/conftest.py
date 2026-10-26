"""Shared fixtures: the fictional demo project and a scripted model client."""

from __future__ import annotations

import re

import pytest

from talent_estimation.catalog import load_default_catalog
from talent_estimation.demo import NOTES_TEXT, PROJECT_NAME, REQUEST_TEXT, build_demo_wbs
from talent_estimation.domain.models import ProjectInfo
from talent_estimation.io import read_wbs
from talent_estimation.skills import schemas as s


@pytest.fixture(scope="session")
def catalog():
    return load_default_catalog()


@pytest.fixture(scope="session")
def demo_wbs() -> bytes:
    return build_demo_wbs()


@pytest.fixture()
def demo_inputs(catalog, demo_wbs):
    from talent_estimation.agents import RunInputs

    parsed = read_wbs(demo_wbs)
    return RunInputs(
        project=ProjectInfo(name=PROJECT_NAME, scope="all"),
        items=parsed.items,
        legend=parsed.role_legend,
        request_text=REQUEST_TEXT,
        supporting_text=NOTES_TEXT,
        catalog=catalog,
    )


class ScriptedLLM:
    """A deterministic stand-in for a chat model, keyed by skill name."""

    def __init__(self) -> None:
        self.calls: list[str] = []
        self.quality_rounds = 0

    async def structured(self, schema, system, user, *, skill):
        self.calls.append(skill)
        ids = re.findall(r"^- \[([^\]]+)\]", user, flags=re.M)
        if skill == "parse_request":
            return s.RequestExtraction(
                requested=[s.RequestedRole(role="DE", fte=1, evidence="1 Data Engineer")]
            )
        if skill == "classify_item":
            reclass = "CATATAN REVIEWER" in user
            items = []
            for item_id, line in zip(
                ids, re.findall(r"^- \[[^\]]+\].*$", user, flags=re.M), strict=True
            ):
                roles = []
                if "Integrasi" in line:
                    roles.append(
                        s.RoleJudgement(
                            role="DE",
                            involvement="Utama",
                            steps=4,
                            classification="Simple" if reclass else "Complex",
                            classification_reason="uji",
                            allocation_fte=0.3 if reclass else 0.5,
                            allocation_reason="uji",
                        )
                    )
                if "KPI" in line:
                    roles.append(
                        s.RoleJudgement(
                            role="DA",
                            involvement="Utama",
                            steps=3,
                            classification="Simple",
                            classification_reason="uji",
                            allocation_fte=0.5,
                            allocation_reason="uji",
                        )
                    )
                roles.append(
                    s.RoleJudgement(
                        role="QA",
                        involvement="Utama",
                        steps=1,
                        classification="Simple",
                        classification_reason="di luar katalog",
                        allocation_fte=1,
                        allocation_reason="x",
                    )
                )
                items.append(s.ItemJudgement(item_id=item_id, roles=roles))
            return s.ClassificationBatch(items=items)
        if skill == "assess_factors":
            return s.FactorAssessment(
                actors=[s.ActorJudgement(name="Sumber data", category="Average")],
                rating_changes=[
                    s.RatingChange(code="T11", rating=4, evidence="Data sensitif"),
                    s.RatingChange(code="E3", rating=5, evidence=""),
                ],
            )
        if skill == "check_quality":
            self.quality_rounds += 1
            if self.quality_rounds == 1:
                return s.QualityReview(
                    findings=[
                        s.FindingDraft(
                            kind="overlap", item_id="4.1.1", role="DE", message="Tumpang tindih"
                        )
                    ],
                    reclassify=[
                        s.ReclassifyRequest(item_id="2.1.2", role="DE", reason="Terlalu tinggi")
                    ],
                    additional_items=[
                        s.AdditionalItem(
                            name="Persiapan workshop",
                            role="DA",
                            allocation_fte=1.0,
                            source="Notulen",
                        )
                    ],
                )
            return s.QualityReview()
        if skill == "assess_ai_assist":
            rows = re.findall(r"^- \[([^\]]+)\] role (\w+)", user, flags=re.M)
            return s.AiAssistBatch(
                rows=[
                    s.RowTasks(
                        item_id=i,
                        role=r,
                        tasks=[
                            s.TaskJudgement(task="kode", weight=0.6, category="routine_code"),
                            s.TaskJudgement(task="rapat", weight=0.6, category="judgment"),
                            s.TaskJudgement(task="karangan", weight=0.2, category="tidak_ada"),
                        ],
                    )
                    for i, r in rows
                ]
            )
        if skill == "draft_message":
            return s.MessageDraft(text="Draf pesan uji.")
        raise AssertionError(skill)


@pytest.fixture()
def scripted_llm():
    return ScriptedLLM()
