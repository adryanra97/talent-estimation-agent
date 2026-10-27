"""Structured outputs requested from language models.

Every judgement made by a model is returned as one of these objects and
validated before use. Numbers that come out of a model are inputs to the
engine (classifications, allocations, ratings), never final results.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from talent_estimation.domain.models import Classification, FindingKind, Involvement, Level


class RequestedRole(BaseModel):
    """FTE requested for one role in the request document."""

    role: str = Field(description="Kode role dari katalog, misalnya DE.")
    fte: float = Field(ge=0, description="Jumlah FTE yang diminta.")
    evidence: str = Field("", description="Kutipan singkat dari dokumen.")


class RequestExtraction(BaseModel):
    """Facts read from the request document."""

    project_name: str = ""
    period_start: date | None = None
    period_end: date | None = None
    requested: list[RequestedRole] = Field(default_factory=list)
    notes: str = Field("", description="Konteks penting lain dari dokumen, maksimal 5 kalimat.")


class CapabilityJudgement(BaseModel):
    """A skill the role needs on the item, with the level of depth required."""

    pillar: str = Field(description="Nama pilar dari pilar skill role di katalog.")
    skill: str = Field(description="Nama skill persis seperti di pilar katalog.")
    level: int = Field(ge=1, le=5, description="Level kedalaman 1-5 sesuai rubrik level.")
    reason: str = Field("", description="Alasan level, paling banyak 15 kata.")


class RoleJudgement(BaseModel):
    """Judgement of one role on one WBS item."""

    role: str = Field(description="Kode role dari katalog.")
    involvement: Involvement
    steps: int = Field(ge=0, description="Jumlah butir pekerjaan pada deskripsi item.")
    classification: Classification
    classification_reason: str = Field(description="Alasan klasifikasi dan peran, 1-2 kalimat.")
    allocation_fte: float = Field(ge=0, le=5, description="FTE role ini selama jendela item.")
    allocation_reason: str = Field(description="Alasan alokasi, 1 kalimat.")
    quantity: float = Field(1.0, ge=0)
    needs_review: bool = False
    capabilities: list[CapabilityJudgement] = Field(
        default_factory=list, description="1-3 skill utama dari katalog role ini."
    )


class ItemJudgement(BaseModel):
    """Roles needed by one WBS item. An empty list means no role in scope."""

    item_id: str
    roles: list[RoleJudgement] = Field(default_factory=list)


class ClassificationBatch(BaseModel):
    """Judgements for a batch of WBS items."""

    items: list[ItemJudgement]


class ActorJudgement(BaseModel):
    """An external actor for the UCP actor weight."""

    name: str
    category: Classification
    count: float = Field(1.0, ge=0)
    source: str = ""


class RatingChange(BaseModel):
    """A UCP factor rating that differs from the neutral value 3."""

    code: str = Field(description="Kode faktor, misalnya T11 atau E3.")
    rating: int = Field(ge=0, le=5)
    evidence: str = Field(description="Bukti tertulis dari dokumen.")


class FactorAssessment(BaseModel):
    """Actors and factor ratings of one role."""

    actors: list[ActorJudgement]
    rating_changes: list[RatingChange] = Field(default_factory=list)


class FindingDraft(BaseModel):
    """An observation proposed by the reviewer."""

    kind: FindingKind
    message: str
    item_id: str | None = None
    role: str | None = None
    severity: Level = "Sedang"


class ReclassifyRequest(BaseModel):
    """A row the reviewer sends back to the estimator."""

    item_id: str
    role: str
    reason: str


class AdditionalItem(BaseModel):
    """Work found outside the WBS, for example in meeting notes."""

    name: str
    description: str = ""
    role: str
    involvement: Involvement = "Utama"
    start: date | None = None
    end: date | None = None
    steps: int = 1
    classification: Classification = "Average"
    allocation_fte: float = Field(0.5, ge=0, le=5)
    reason: str = ""
    source: str = ""


class QualityReview(BaseModel):
    """Result of the reviewer's quality check."""

    findings: list[FindingDraft] = Field(default_factory=list)
    reclassify: list[ReclassifyRequest] = Field(default_factory=list)
    additional_items: list[AdditionalItem] = Field(default_factory=list)


class TaskJudgement(BaseModel):
    """One task inside a breakdown row and the AI assistance that fits it."""

    task: str
    weight: float = Field(ge=0, le=1, description="Porsi tugas dalam baris; total per baris 1.")
    pillar: str = ""
    skill: str = ""
    category: str = Field(description="Kunci kategori bantuan AI dari daftar.")
    confidence: Level = "Sedang"
    prerequisite: str = ""
    reason: str = ""


class RowTasks(BaseModel):
    """Tasks of one breakdown row."""

    item_id: str
    role: str
    tasks: list[TaskJudgement]


class AiAssistBatch(BaseModel):
    """AI assistance judgements for a batch of rows."""

    rows: list[RowTasks]


class MessageDraft(BaseModel):
    """Draft reply to the request."""

    text: str
