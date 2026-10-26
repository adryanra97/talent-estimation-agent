"""Prompt templates for the LLM skills.

Prompts describe the judgement to make and the closed set of answers allowed.
They never ask the model to compute effort or FTE.
"""

from __future__ import annotations

from talent_estimation.catalog.loader import Catalog

BASE_SYSTEM = (
    "Kamu adalah analis kebutuhan talent yang teliti. Kamu menilai pekerjaan dan menjelaskan "
    "alasanmu dengan singkat dan faktual dalam bahasa Indonesia. Kamu tidak menghitung effort "
    "atau FTE total; perhitungan dilakukan oleh sistem. Jangan mengarang data yang tidak ada di "
    "masukan. Jika ragu, tandai perlu review."
)


def catalog_block(catalog: Catalog, roles: list[str]) -> str:
    """Describe the roles in scope and the decision rules."""
    described = "\n\n".join(catalog.roles[r].describe() for r in roles if r in catalog.roles)
    rules = "\n".join(f"{rule.id} {rule.title}: {rule.text}" for rule in catalog.rules)
    rubric = "\n".join(f"- {k}: {v}" for k, v in catalog.classification_rubric.items())
    guide = "\n".join(
        f"- {g['involvement']} {g['classification']}: {g['range']} FTE ({g['meaning']})"
        for g in catalog.allocation_guide
    )
    return (
        f"KATALOG ROLE DALAM CAKUPAN:\n{described}\n\n"
        f"ATURAN KEPUTUSAN:\n{rules}\n\n"
        f"RUBRIK KLASIFIKASI:\n{rubric}\n\n"
        f"PANDUAN ALOKASI FTE PER ITEM:\n{guide}"
    )


PARSE_REQUEST = """Baca dokumen permintaan talent berikut dan ambil faktanya.

Role yang dikenal (gunakan kodenya): {roles}

Aturan:
- Isi `requested` hanya untuk role di atas yang jumlahnya disebut jelas. Jika jumlah orang
  disebut tanpa FTE, anggap 1 orang = 1 FTE dan tulis itu di evidence.
- Isi periode hanya jika tanggal disebut jelas.
- Abaikan nama orang. Jangan menyalin data pribadi.

DOKUMEN:
{text}
"""

CLASSIFY = """{catalog}

KONTEKS PROYEK:
{context}

Untuk setiap item WBS di bawah, tentukan role dalam cakupan yang dibutuhkan. Untuk tiap role:
- involvement: Utama atau Pendukung (aturan R3).
- steps: jumlah butir pekerjaan pada deskripsi (aturan R8).
- classification: Simple, Average, atau Complex dari jumlah langkah; naik atau turun satu
  kelas hanya dengan alasan jelas.
- allocation_fte: FTE role pada item selama jendela waktunya, mengikuti panduan alokasi.
  Pertimbangkan jumlah hari kerja item. Jangan menyalin jumlah orang yang diminta (aturan R5).
- needs_review: true bila ragu, bila role tidak disebut di kolom role WBS tetapi isi
  pekerjaannya jelas membutuhkan (aturan R4), atau bila item tampak tumpang tindih (R6).
Item yang tidak membutuhkan role dalam cakupan dikembalikan dengan daftar roles kosong.
Kolom "role di WBS" hanya petunjuk.
{feedback}
ITEM WBS:
{items}
"""

FACTORS = """{catalog}

KONTEKS PROYEK:
{context}

Role yang dinilai: {role}

Pekerjaan role ini pada proyek:
{rows}

1. Daftarkan aktor Use Case Points: pihak atau sistem DI LUAR role ini yang berinteraksi dengan
   pekerjaannya (sumber data, sistem lain, pengguna atau stakeholder). Gunakan kategori:
{actor_rubric}
   Tulis sumbernya (ID item WBS atau dokumen). Maksimal 8 aktor.
2. Rating faktor TCF/EF bernilai default 3. Usulkan perubahan HANYA bila ada bukti tertulis pada
   konteks atau dokumen (misalnya keamanan data khusus untuk T11). Faktor yang tersedia:
{factors}
"""

QUALITY = """{catalog}

KONTEKS PROYEK:
{context}

Kamu adalah reviewer. Periksa hasil breakdown di bawah.

1. Baris kandidat berikut punya selisih besar antara metode UCP dan bottom-up. Untuk setiap
   kandidat, putuskan apakah klasifikasi atau alokasinya perlu dinilai ulang. Kirim ke
   `reclassify` hanya bila ada alasan jelas, dengan alasan yang spesifik.
{candidates}

2. Catat temuan penting di `findings`:
   - gap: isi pekerjaan butuh role dalam cakupan tetapi tidak ada barisnya;
   - overlap: dua item mencakup pekerjaan sama dengan periode beririsan;
   - data_quality: tanggal atau hari kerja janggal;
   - assumption: asumsi penting lain.
3. Jika dokumen tambahan menyebut pekerjaan role dalam cakupan yang tidak ada di WBS, usulkan di
   `additional_items` dengan sumber yang jelas (aturan R10). Gunakan tanggal dalam periode proyek.

BREAKDOWN SAAT INI:
{rows}

DOKUMEN TAMBAHAN:
{documents}
"""

AI_ASSIST = """{catalog}

Untuk setiap baris breakdown di bawah, uraikan pekerjaan role pada item menjadi 2-5 tugas.
Untuk tiap tugas:
- weight: porsi tugas dalam baris (total per baris = 1);
- pillar dan skill: ambil dari pilar skill role di katalog;
- category: pilih SATU kunci dari kategori bantuan AI di bawah, sesuai sifat tugasnya;
- confidence: Tinggi, Sedang, atau Rendah;
- prerequisite: syarat agar bantuan AI dapat dipakai (misalnya tool yang diizinkan);
- reason: alasan singkat.
Jangan menentukan persentase hemat; sistem memakai rentang dari kategori.

KATEGORI BANTUAN AI:
{categories}

TOOL AI YANG DIIZINKAN: {tools}

BARIS:
{rows}
"""

MESSAGE = """Susun draf pesan balasan untuk permintaan talent berdasarkan ringkasan berikut.
Nada netral dan profesional, bahasa Indonesia, 120-220 kata, tanpa emoji, tanpa nama orang.
Struktur: pembuka singkat; hasil per role (kebutuhan total dua metode dan dibandingkan dengan
permintaan); temuan terpenting; keputusan yang dibutuhkan dari peminta. Jangan menambah angka
yang tidak ada di ringkasan.

RINGKASAN:
{summary}
"""
