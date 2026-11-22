import {
  ArrowRight,
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
import { Card } from "@/components/ui";
import { ResourceHero, ResourceHeading } from "@/components/resource-page";
import Link from "next/link";

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
  ["Agent", "Python 3.12, LangGraph", "Graph berurutan dengan loop review terbatas dan cabang opsional untuk skenario AI"],
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
  ["pytest + coverage", "Tes unit, integrasi dan API; lihat status terbaru pada CI"],
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
  ["Kalibrasi PHM", "Nilai bawaan 15 diambil dari batas bawah literatur. Kalibrasi dengan pipeline Kedro pada beberapa proyek yang sudah direview."],
  ["Autentikasi", "Aktifkan perlindungan deployment atau SSO organisasi agar hanya pengguna berwenang yang bisa membuka aplikasi."],
  ["Persetujuan keamanan data", "Pastikan penyedia model dan region pemrosesan disetujui untuk jenis dokumen yang diunggah."],
  ["Observabilitas", "Tambahkan pemantauan galat dan latensi tanpa mencatat isi dokumen atau key."],
  ["Pembatasan pemakaian", "Batasi jumlah run per pengguna untuk mencegah penyalahgunaan endpoint."],
];

export default function AboutPage() {
  return (
    <div className="tl-resource-page tl-about-page">
      <ResourceHero eyebrow="TENTANG / PRODUK & REKAYASA"
        title="TalentLens." accent="Dari WBS ke keputusan."
        description="Platform untuk menerjemahkan WBS menjadi estimasi kebutuhan talent dan capability yang dapat dijelaskan, ditinjau, dan ditindaklanjuti."
        chapter="TENTANG / 04"
        actions={<Link href="/validasi">Mulai analisis <ArrowRight size={16} aria-hidden /></Link>}
      />
      <div className="tl-resource-body">
        <section className="tl-about-intro" aria-labelledby="about-mission">
          <div>
            <p className="tl-resource-eyebrow">TUJUAN KAMI</p>
            <h2 id="about-mission">Dari kebutuhan proyek menjadi keputusan workforce yang bisa dipertanggungjawabkan.</h2>
            <p>TalentLens menggabungkan pembacaan dokumen proyek, penilaian capability, dua pendekatan estimasi, dan review manusia dalam satu alur. Tujuannya bukan menggantikan pengambil keputusan, melainkan memperjelas bukti di balik alokasi talent.</p>
          </div>
          <div className="tl-about-intro-aside">
            <strong>Peran AI dan manusia</strong>
            <p>Agent menilai konteks dan menelusuri perbedaan. Perhitungan angka dilakukan oleh kode. Pengguna memeriksa asumsi, mengoreksi item, dan memutuskan hasil akhir.</p>
            <Link href="/metodologi" className="tl-resource-action-link mt-4">Pelajari metodologi <ArrowRight size={15} aria-hidden /></Link>
          </div>
        </section>

        <section aria-labelledby="about-strengths">
          <ResourceHeading index="01" label="PRINSIP PRODUK" title="Apa yang membedakan TalentLens"
            id="about-strengths" description="Keputusan staffing lebih mudah direview ketika setiap angka mempunyai sumber, metode, dan konteks yang jelas." />
          <div className="tl-about-strengths">
            {STRENGTHS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="tl-about-strength">
                <span aria-hidden><Icon /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-flow">
          <ResourceHeading index="02" label="ALUR AGENT" id="about-flow" title="Bagaimana keputusan disusun"
            description="Setiap tahap punya tanggung jawab yang berbeda, dengan jalur pemeriksaan ulang ketika Reviewer menemukan hal yang perlu dievaluasi." />
          <ol className="tl-about-journey">
            {[
              ["Orchestrator", "Mengatur alur dan koordinasi proses"],
              ["Intake", "Membaca WBS dan dokumen permintaan"],
              ["Estimator", "Menilai role, capability, kelas, dan alokasi"],
              ["Reviewer", "Memeriksa selisih serta item yang janggal"],
              ["AI Augmentation", "Memetakan peluang bantuan AI secara opsional"],
              ["Report", "Menyusun hasil, Excel, dan draf komunikasi"],
            ].map(([title, text], index) => (
              <li key={title}>
                <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3><p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="tl-resource-note mt-4">Tahap bantuan AI dapat dilewati. Jika Reviewer menemukan item yang perlu dinilai ulang, alur dapat kembali ke Estimator sebelum hasil akhir disusun.</p>
        </section>

        <section aria-labelledby="about-pilot">
          <ResourceHeading index="03" label="KESIAPAN & TATA KELOLA" title="Siap untuk pilot terkontrol"
            id="about-pilot" description="Komponen dasar aplikasi tersedia untuk eksplorasi dan validasi. Kesiapan operasional organisasi memerlukan pengujian dan kontrol tambahan." />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Fondasi yang tersedia" description="Fitur dan kontrol yang sudah dirancang dalam aplikasi.">
              <ul className="space-y-3 text-sm">
                {READY.map((text) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-label="Tersedia" />
                    <span className="leading-relaxed text-ink">{text}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Sebelum penggunaan produksi" description="Prioritas yang perlu diselesaikan dalam konteks organisasi.">
              <ul className="space-y-3 text-sm">
                {BEFORE_PRODUCTION.map(([title, text]) => (
                  <li key={title} className="flex items-start gap-2.5">
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-label="Perlu ditindaklanjuti" />
                    <span><strong className="text-ink">{title}</strong><span className="mt-0.5 block leading-relaxed text-muted">{text}</span></span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <details className="tl-about-technical">
          <summary>Untuk pembaca teknis: arsitektur, stack, dan pengujian</summary>
          <div className="tl-about-technical-body grid gap-6 lg:grid-cols-2">
            <Card title="Arsitektur dan teknologi" description="Komponen yang digunakan untuk membangun TalentLens.">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {STACK.map(([layer, tech, why]) => (
                      <tr key={layer} className="border-b border-line align-top last:border-0">
                        <th scope="row" className="w-28 py-3 pr-4 text-left text-xs font-semibold text-ink">{layer}</th>
                        <td className="py-3"><strong className="text-ink font-semibold">{tech}</strong><p className="mt-1 text-xs leading-relaxed text-muted">{why}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Verifikasi yang dikonfigurasi" description="Status run terbaru sebaiknya diperiksa langsung di GitHub Actions."
              actions={<a href="https://github.com/adryanra97/talent-estimation-agent/actions/workflows/ci.yml" target="_blank" rel="noreferrer"
                className="tl-resource-action-link">Lihat CI <ArrowRight size={14} aria-hidden /></a>}>
              <ul className="space-y-3">
                {CHECKS.map(([name, text]) => (
                  <li key={name} className="border-b border-line pb-3 last:border-0">
                    <strong className="text-xs text-ink">{name}</strong>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </details>
      </div>
    </div>
  );
}
