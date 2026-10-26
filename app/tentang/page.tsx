import {
  CheckCircle2,
  CircleDashed,
  Cpu,
  FileSpreadsheet,
  GitBranch,
  Layers,
  Lock,
  Repeat,
  Scale,
  Sparkles,
} from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

const STRENGTHS = [
  {
    icon: Scale,
    title: "Dua metode independen",
    text: "Use Case Points dan bottom-up dihitung terpisah. Bila sepakat, angkanya lebih dapat dipercaya; bila berbeda, Reviewer Agent memeriksa barisnya.",
  },
  {
    icon: Layers,
    title: "Setiap angka bisa ditelusuri",
    text: "Satu baris = satu item WBS untuk satu role, lengkap dengan alasan klasifikasi dan alokasi. Tidak ada angka tanpa asal.",
  },
  {
    icon: Cpu,
    title: "Model menilai, kode menghitung",
    text: "Model bahasa hanya memilih dari pilihan tertutup dan menjelaskan alasannya. Semua angka berasal dari satu mesin hitung yang deterministik.",
  },
  {
    icon: Repeat,
    title: "Agent yang memeriksa dirinya sendiri",
    text: "Reviewer Agent mengirim baris yang janggal kembali ke Estimator, maksimal dua putaran, lalu sisanya ditandai untuk manusia.",
  },
  {
    icon: Lock,
    title: "Tanpa penyimpanan",
    text: "Tidak ada database dan tidak ada file yang ditulis di server. API key hanya di memori tab. Data pribadi disamarkan sebelum dikirim ke model.",
  },
  {
    icon: GitBranch,
    title: "Bebas memilih model",
    text: "Gemini, Claude, OpenAI, Azure OpenAI, atau endpoint kustom. Ganti penyedia tanpa mengubah kode skill.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel yang hidup",
    text: "File unduhan berisi rumus, bukan angka mati. Reviewer bisa mengubah satu input dan semua total ikut berubah.",
  },
  {
    icon: Sparkles,
    title: "Skenario bantuan AI",
    text: "Augmentation Agent memetakan tugas yang dapat dipercepat AI per capability, terpisah dari angka dasar.",
  },
];

const STACK = [
  ["Agent", "Python 3.12, LangGraph", "Graph dengan cabang paralel, loop review terbatas, dan node yang menunggu semua cabang"],
  ["Kontrak data", "Pydantic v2", "Setiap jawaban model divalidasi skema; jawaban tidak valid dicoba ulang dengan pesan galat"],
  ["Model", "LangChain chat models", "Satu antarmuka structured output untuk lima jenis penyedia"],
  ["API", "FastAPI di Vercel Python Functions", "Stateless, streaming progres per agent (NDJSON)"],
  ["Mesin hitung", "Python murni", "Satu sumber kebenaran untuk layar dan Excel"],
  ["Excel", "openpyxl", "Workbook dengan rumus, dihitung ulang Excel saat dibuka"],
  ["Antarmuka", "Next.js, React, Tailwind CSS, Recharts", "Mengikuti 10 heuristik usability Nielsen Norman Group"],
  ["Evaluasi", "Kedro", "Pipeline offline: akurasi per penyedia dan kalibrasi PHM"],
  ["Tooling", "uv, Ruff, mypy, pytest, pre-commit", "Environment identik untuk semua orang; docstring gaya NumPy"],
];

const CHECKS = [
  ["Ruff lint", "Gaya kode, impor, pola bug, docstring NumPy"],
  ["Ruff format", "Format kode konsisten"],
  ["mypy", "Kebenaran tipe seluruh package"],
  ["pytest + coverage", "23 test unit, integrasi, dan API; coverage 94%"],
  ["Uji rumus Excel", "LibreOffice menghitung ulang workbook; hasilnya harus sama dengan mesin hitung"],
  ["Golden test", "Mesin hitung mereproduksi workbook yang dihitung manual pada proyek nyata, sampai 6 desimal"],
  ["Pipeline Kedro", "Pipeline evaluasi berjalan pada kasus contoh"],
  ["Sinkron dependensi", "requirements.txt untuk Vercel sama dengan uv.lock"],
  ["TypeScript dan build", "Antarmuka lolos cek tipe dan build produksi"],
];

const READY = [
  "Arsitektur stateless tanpa penyimpanan data",
  "CI otomatis untuk setiap push, dengan laporan per pemeriksaan",
  "Test otomatis untuk mesin hitung, agent, Excel, dan API",
  "Validasi skema dan batas putaran untuk setiap keputusan model",
  "Penyamaran data pribadi sebelum dikirim ke model",
  "Dokumentasi analisis dan desain lengkap dengan diagram dan ADR",
];

const BEFORE_PRODUCTION = [
  ["Uji dengan model nyata", "Jalankan pada beberapa proyek dengan tiap penyedia yang akan dipakai dan bandingkan dengan keputusan reviewer."],
  ["Kalibrasi PHM", "Nilai bawaan 9 berasal dari satu proyek. Kalibrasi dengan pipeline Kedro pada beberapa proyek yang sudah direview."],
  ["Autentikasi", "Aktifkan perlindungan deployment atau SSO organisasi agar hanya pengguna berwenang yang bisa membuka aplikasi."],
  ["Persetujuan keamanan data", "Pastikan penyedia model dan region pemrosesan disetujui untuk jenis dokumen yang diunggah."],
  ["Observabilitas", "Tambahkan pemantauan galat dan latensi tanpa mencatat isi dokumen atau key."],
  ["Pembatasan pemakaian", "Batasi jumlah run per pengguna untuk mencegah penyalahgunaan endpoint."],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Tentang Aplikasi"
        description="Talent Estimation Agent memvalidasi permintaan talent dari WBS dengan dua metode estimasi, sekumpulan agent yang saling memeriksa, dan mesin hitung yang dapat diaudit."
      />

      <section aria-labelledby="keunggulan" className="mb-10">
        <h2 id="keunggulan" className="mb-4 text-lg font-semibold text-ink">
          Keunggulan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STRENGTHS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-line bg-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="alur" className="mb-10">
        <h2 id="alur" className="mb-4 text-lg font-semibold text-ink">
          Cara kerja
        </h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {[
            ["Intake Agent", "Membaca WBS dan dokumen permintaan"],
            ["Estimator Agent", "Menilai role, kelas, dan alokasi per item; menghitung"],
            ["Reviewer Agent", "Membandingkan dua metode; mengirim baris janggal untuk dinilai ulang"],
            ["Augmentation Agent", "Memetakan peluang bantuan AI per capability"],
            ["Report", "Menyusun ringkasan, Excel, dan draf pesan"],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold text-accent-700">Langkah {i + 1}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Reviewer dan Augmentation berjalan paralel. Review manusia dilakukan setelah agent selesai: setiap koreksi dihitung ulang tanpa memanggil model.
        </p>
      </section>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <Card title="Stack teknologi">
          <table className="w-full text-sm">
            <tbody>
              {STACK.map(([layer, tech, why]) => (
                <tr key={layer} className="border-b border-line align-top last:border-0">
                  <td className="w-28 py-2.5 pr-3 font-medium text-ink">{layer}</td>
                  <td className="py-2.5">
                    <p className="text-ink">{tech}</p>
                    <p className="text-xs text-muted">{why}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card
          title="Verifikasi otomatis"
          description="Dijalankan GitHub Actions pada setiap push. Semua pemeriksaan berjalan sampai selesai dan hasilnya tercatat per pemeriksaan."
          actions={
            <a
              href="https://github.com/adryanra97/talent-estimation-agent/actions/workflows/ci.yml"
              className="text-sm font-medium text-accent-700 underline"
            >
              Lihat CI
            </a>
          }
        >
          <ul className="space-y-2.5 text-sm">
            {CHECKS.map(([name, text]) => (
              <li key={name} className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  <span className="font-medium text-ink">{name}</span>
                  <span className="text-muted"> · {text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="kesiapan">
        <h2 id="kesiapan" className="mb-1 text-lg font-semibold text-ink">
          Kesiapan produksi
        </h2>
        <p className="mb-4 max-w-3xl text-sm text-muted">
          Fondasi teknisnya sudah siap untuk pilot. Beberapa langkah berikut perlu diselesaikan sebelum dipakai sebagai sistem produksi organisasi.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Sudah siap">
            <ul className="space-y-2.5 text-sm">
              {READY.map((text) => (
                <li key={text} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Siap" />
                  <span className="text-ink">{text}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Sebelum produksi">
            <ul className="space-y-3 text-sm">
              {BEFORE_PRODUCTION.map(([title, text]) => (
                <li key={title} className="flex gap-2.5">
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Belum" />
                  <span>
                    <span className="font-medium text-ink">{title}</span>
                    <span className="block text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
}
