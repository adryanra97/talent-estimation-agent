"""Registry of skills and agent cards.

Agent cards describe each agent so that other agents or tools can discover
what it does. The structure follows the idea of the A2A agent card: a name, a
description, and a list of skills with their inputs and outputs.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class SkillSpec(BaseModel):
    """Description of one skill."""

    name: str
    kind: Literal["llm", "code"]
    description: str
    inputs: str
    outputs: str


class AgentCard(BaseModel):
    """Description of one agent."""

    name: str
    description: str
    optional: bool = False
    skills: list[SkillSpec]


AGENT_CARDS: list[AgentCard] = [
    AgentCard(
        name="Orchestrator",
        description="Mengatur urutan agent, cakupan role, retry, batas putaran review, dan "
        "mencatat jejak keputusan setiap langkah.",
        skills=[],
    ),
    AgentCard(
        name="Intake Agent",
        description="Membaca WBS dan dokumen permintaan menjadi data terstruktur.",
        skills=[
            SkillSpec(
                name="parse_wbs", kind="code",
                description="Mengenali tabel WBS, mengambil item level terbawah, dan legenda kode role.",
                inputs="File WBS (.xlsx)", outputs="Daftar WbsItem, legenda role",
            ),
            SkillSpec(
                name="parse_request", kind="llm",
                description="Membaca FTE yang diminta per role dan periode dari dokumen permintaan.",
                inputs="Teks dokumen permintaan", outputs="RequestExtraction",
            ),
            SkillSpec(
                name="map_capability", kind="code",
                description="Mencocokkan petunjuk role di WBS dengan katalog capability.",
                inputs="Kolom role WBS, katalog", outputs="Kode role per item",
            ),
        ],
    ),
    AgentCard(
        name="Estimator Agent",
        description="Menentukan role, peran, klasifikasi, dan alokasi per item, lalu menghitung "
        "kebutuhan dengan UCP dan bottom-up.",
        skills=[
            SkillSpec(
                name="classify_item", kind="llm",
                description="Menilai role yang dibutuhkan tiap item beserta peran, kelas, dan alokasi FTE.",
                inputs="Item WBS, katalog, aturan", outputs="BreakdownRow",
            ),
            SkillSpec(
                name="assess_factors", kind="llm",
                description="Menentukan aktor UCP dan rating faktor TCF/EF yang punya bukti.",
                inputs="Baris role, konteks", outputs="RoleFactors",
            ),
            SkillSpec(
                name="ucp_calc", kind="code",
                description="Menghitung Use Case Points, man-hours, dan FTE.",
                inputs="Breakdown, faktor, parameter", outputs="RoleEstimate",
            ),
            SkillSpec(
                name="bu_calc", kind="code",
                description="Menghitung person-days bottom-up dan sebaran bulanan.",
                inputs="Breakdown, parameter", outputs="RoleEstimate, MonthlyFte",
            ),
        ],
    ),
    AgentCard(
        name="Reviewer Agent",
        description="Membandingkan dua metode, mengirim baris yang janggal ke Estimator untuk "
        "dinilai ulang (maksimal dua putaran), dan mencatat temuan.",
        skills=[
            SkillSpec(
                name="reconcile", kind="code",
                description="Mencari baris dan role dengan selisih UCP dan bottom-up di luar batas.",
                inputs="Hasil hitung", outputs="Kandidat review, temuan selisih",
            ),
            SkillSpec(
                name="check_quality", kind="llm",
                description="Menilai kandidat, mencari gap, tumpang tindih, dan pekerjaan di luar WBS.",
                inputs="Breakdown, kandidat, dokumen tambahan", outputs="QualityReview",
            ),
        ],
    ),
    AgentCard(
        name="Augmentation Agent",
        description="Memetakan bagian pekerjaan yang dapat dipercepat dengan bantuan AI per "
        "capability, sebagai skenario terpisah dari angka dasar.",
        optional=True,
        skills=[
            SkillSpec(
                name="assess_ai_assist", kind="llm",
                description="Mengurai baris menjadi tugas, memetakan skill, dan memilih kategori bantuan AI.",
                inputs="Breakdown, katalog, kategori AI", outputs="AiTask",
            ),
            SkillSpec(
                name="calc_ai_savings", kind="code",
                description="Menghitung hemat tertimbang dan FTE dengan bantuan AI.",
                inputs="AiTask, breakdown", outputs="AiAssessment",
            ),
        ],
    ),
    AgentCard(
        name="Report",
        description="Menyusun draf pesan balasan dan file Excel.",
        skills=[
            SkillSpec(
                name="draft_message", kind="llm",
                description="Menyusun draf balasan dari ringkasan hasil.",
                inputs="Hasil run", outputs="Teks pesan",
            ),
            SkillSpec(
                name="fill_excel", kind="code",
                description="Membangun workbook validasi lengkap dengan rumus.",
                inputs="Hasil run, katalog", outputs="File .xlsx",
            ),
        ],
    ),
]  # fmt: skip
