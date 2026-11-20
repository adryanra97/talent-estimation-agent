"""Feedback records and the Feedback Agent's diagnosis."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Target = Literal[
    "intake", "estimator", "reviewer", "augmentation", "report", "catalog", "parameter", "data"
]
ChangeKind = Literal["prompt_guidance", "catalog_change", "parameter_change", "no_change"]
Status = Literal["pending", "approved", "rejected"]
Rating = Literal["accurate", "partly", "inaccurate"]

TARGET_LABELS: dict[str, str] = {
    "intake": "Intake Agent",
    "estimator": "Estimator Agent",
    "reviewer": "Reviewer Agent",
    "augmentation": "Augmentation Agent",
    "report": "Report",
    "catalog": "Katalog capability",
    "parameter": "Parameter hitung",
    "data": "Data masukan",
}

AGENT_SKILLS: dict[str, tuple[str, ...]] = {
    "intake": ("parse_request",),
    "estimator": ("classify_item", "assess_factors"),
    "reviewer": ("check_quality",),
    "augmentation": ("assess_ai_assist",),
    "report": ("draft_message",),
}
"""LLM skills whose system prompt receives approved guidance for an agent."""


class RoleSnapshot(BaseModel):
    """One role's numbers at the time the feedback was written."""

    role: str
    requested_fte: float | None = None
    ucp_fte: float = 0
    bu_fte: float = 0
    conclusion: str = ""


class RunSnapshot(BaseModel):
    """Enough of a run to understand a feedback item later, without the documents."""

    project_name: str = ""
    period: str = ""
    roles: list[RoleSnapshot] = Field(default_factory=list, max_length=20)
    review_rows: int = 0
    guidance_used: list[str] = Field(default_factory=list)


class Diagnosis(BaseModel):
    """What the Feedback Agent thinks went wrong and what it proposes."""

    target: Target
    kind: ChangeKind
    summary: str = Field(max_length=600)
    proposal: str = Field(default="", max_length=500)
    confidence: Literal["rendah", "sedang", "tinggi"] = "sedang"
    by: Literal["model", "aturan"] = "aturan"


class Feedback(BaseModel):
    """A reviewer's note on a result, its diagnosis, and the admin decision."""

    id: str
    created_at: str
    author: str
    rating: Rating
    page: str | None = None
    role: str | None = None
    text: str = Field(min_length=20, max_length=2000)
    snapshot: RunSnapshot = Field(default_factory=RunSnapshot)
    diagnosis: Diagnosis | None = None
    status: Status = "pending"
    decided_by: str | None = None
    decided_at: str | None = None
    decision_note: str = ""
    active: bool = False
    """Approved prompt guidance currently injected into agent prompts."""


class Guidance(BaseModel):
    """An approved, active note added to one agent's prompts."""

    id: str
    target: str
    text: str
    approved_by: str | None
    approved_at: str | None
