"""A fictional sample project used by the demo mode and the tests.

All names and numbers are invented. The workbook is generated in memory so
that the repository holds no binary files.
"""

from __future__ import annotations

import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Font

PROJECT_NAME = "Platform Analitik Layanan Publik (contoh)"

WBS_ROWS: list[tuple[str, str, str, str, date | None, date | None]] = [
    ("1.0", "Manajemen Proyek", "Pengelolaan proyek", "Project Manager", date(2027, 2, 1), date(2027, 4, 30)),
    ("1.1", "Perencanaan", "Perencanaan dan kebutuhan", "Project Manager", date(2027, 2, 1), date(2027, 2, 19)),
    ("1.1.1", "Kick-off dan rencana kerja", "Kick-off, finalisasi scope, jadwal", "Project Manager", date(2027, 2, 1), date(2027, 2, 5)),
    ("1.1.2", "Kebutuhan dan kriteria penerimaan", "Pengumpulan kebutuhan, user story, kriteria penerimaan", "Business Analyst, Data Analyst", date(2027, 2, 1), date(2027, 2, 19)),
    ("2.0", "Use Case Pengaduan Warga", "Analitik pengaduan warga", "", date(2027, 2, 8), date(2027, 4, 9)),
    ("2.1", "Pengaduan Warga", "Data, analitik, dan AI pengaduan", "", date(2027, 2, 8), date(2027, 4, 9)),
    ("2.1.1", "Pemetaan sumber data pengaduan", "Validasi kebutuhan, indikator, sumber data dan data mapping", "Business Analyst, Data Engineer, Data Analyst", date(2027, 2, 8), date(2027, 2, 19)),
    ("2.1.2", "Integrasi data pengaduan", "Ingestion, cleansing, transformation dan data validation", "Data Engineer", date(2027, 2, 15), date(2027, 3, 12)),
    ("2.1.3", "KPI layanan pengaduan", "KPI, aggregation, calculation dan trend waktu penyelesaian", "Data Analyst, Data Scientist", date(2027, 3, 1), date(2027, 3, 19)),
    ("2.1.4", "Klasifikasi topik pengaduan", "Text preprocessing, model klasifikasi topik, evaluasi akurasi dan analisis kesalahan", "Data Scientist", date(2027, 3, 8), date(2027, 4, 2)),
    ("2.1.5", "Dashboard pengaduan", "Desain tampilan, komponen grafik, integrasi API", "Frontend Developer", date(2027, 3, 15), date(2027, 4, 9)),
    ("2.1.6", "AI insight pengaduan", "AI insight, prompt template dan context handling", "AI Engineer", date(2027, 3, 22), date(2027, 4, 9)),
    ("3.0", "Use Case Transportasi Publik", "Analitik transportasi publik", "", date(2027, 2, 15), date(2027, 4, 23)),
    ("3.1", "Transportasi Publik", "Data, analitik, dan AI transportasi", "", date(2027, 2, 15), date(2027, 4, 23)),
    ("3.1.1", "Pemetaan sumber data transportasi", "Validasi indikator, sumber data dan mapping", "Business Analyst, Data Engineer", date(2027, 2, 15), date(2027, 2, 26)),
    ("3.1.2", "Integrasi data transportasi", "Ingestion, cleansing, transformation, data validation dan data quality monitoring", "Data Engineer", date(2027, 3, 1), date(2027, 3, 26)),
    ("3.1.3", "Analisis okupansi dan rute", "KPI okupansi, aggregation, trend dan segmentasi rute", "Data Analyst", date(2027, 3, 15), date(2027, 4, 9)),
    ("3.1.4", "Prediksi kepadatan", "Feature engineering, forecasting model, anomaly detection, evaluasi dan tuning", "Data Scientist", date(2027, 3, 22), date(2027, 4, 23)),
    ("3.1.5", "AI insight transportasi", "AI insight, prompt template dan evaluasi relevansi", "AI Engineer", date(2027, 4, 5), date(2027, 4, 23)),
    ("4.0", "Platform Bersama", "Komponen bersama seluruh use case", "", date(2027, 3, 1), date(2027, 4, 30)),
    ("4.1", "Data dan AI Bersama", "Layanan bersama", "", date(2027, 3, 1), date(2027, 4, 30)),
    ("4.1.1", "Integrasi sumber bersama", "Source registration, integration dan mapping seluruh use case", "Data Engineer", date(2027, 3, 1), date(2027, 4, 30)),
    ("4.1.2", "Monitoring kualitas data", "Data quality monitoring, freshness, latency dan alerting threshold", "Data Engineer, Backend Developer", date(2027, 3, 15), date(2027, 4, 30)),
    ("4.1.3", "Layanan AI bersama", "AI service, orchestration, context handling dan RAG", "AI Engineer", date(2027, 3, 1), date(2027, 4, 30)),
    ("4.1.4", "Evaluasi AI", "Prompt evaluation dan tuning, evaluasi akurasi atau halusinasi", "AI Engineer", date(2027, 4, 5), date(2027, 4, 30)),
    ("5.0", "Uji dan Serah Terima", "Pengujian dan serah terima", "", date(2027, 4, 12), date(2027, 4, 30)),
    ("5.1.1", "User acceptance test", "Skenario uji, eksekusi UAT, perbaikan", "QA Engineer, Business Analyst", date(2027, 4, 12), date(2027, 4, 23)),
    ("5.1.2", "Dokumentasi dan transfer pengetahuan", "Dokumentasi teknis, panduan pengguna, sesi transfer pengetahuan", "Business Analyst", date(2027, 4, 19), date(2027, 4, 30)),
]  # fmt: skip

REQUEST_TEXT = """DOKUMEN PERMINTAAN TALENT (CONTOH)

Perihal: Permintaan dukungan talent tim data untuk Platform Analitik Layanan Publik.

Sehubungan dengan pengembangan platform analitik untuk dua use case (pengaduan warga dan
transportasi publik), tim produk memohon dukungan tambahan talent sebagai berikut:
- 1 Data Engineer
- 0,5 FTE Data Analyst
- 1 Data Scientist
- 0,5 FTE AI Engineer

Periode penugasan 1 Februari 2027 sampai 30 April 2027. WBS terlampir.
"""

NOTES_TEXT = """NOTULEN RAPAT KOORDINASI (CONTOH)

1. Disepakati tim data menyiapkan dan memvalidasi data seluruh use case sebagai bahan workshop
   pemangku kepentingan pada 8-12 Maret 2027.
2. Dashboard analitik per use case akan dibuat oleh tim frontend memakai dataset dari tim data.
"""


def build_demo_wbs() -> bytes:
    """Return the sample WBS as an Excel file.

    Returns
    -------
    bytes
        ``.xlsx`` content with one WBS sheet.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "WBS"
    sheet.append(["WBS", "Work Package", "Deskripsi", "Role", "Start", "End", "WD"])
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    for item_id, name, description, role, start, end in WBS_ROWS:
        sheet.append([item_id, name, description, role, start, end, None])
    for row in sheet.iter_rows(min_row=2):
        row[4].number_format = row[5].number_format = "dd-mmm-yyyy"
    for column, width in zip("ABCDEFG", (8, 36, 60, 40, 12, 12, 6), strict=True):
        sheet.column_dimensions[column].width = width
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
