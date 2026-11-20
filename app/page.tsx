"use client";

import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2,
  ChevronRight, FileSpreadsheet, Layers3, Menu, Play, SearchCheck,
  ShieldCheck, Sparkles, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

type Perspective = "fte" | "capability" | "ai";

const perspectives: Record<Perspective, {
  kicker: string;
  heading: string;
  description: string;
  columns: [string, string];
  rows: { name: string; left: number; right: number; detail: string }[];
  takeaway: string;
}> = {
  fte: {
    kicker: "01 / WORKFORCE",
    heading: "Two methods. One clearer picture.",
    description: "UCP mengukur kompleksitas. Bottom-up mengukur effort pekerjaan. Bandingkan keduanya tanpa kehilangan alasan di balik angkanya.",
    columns: ["UCP", "Bottom-up"],
    rows: [
      { name: "Data Engineer", left: 1.12, right: 1.07, detail: "Perlu ditinjau: 1 item" },
      { name: "AI Engineer", left: 0.78, right: 0.74, detail: "Selisih kecil" },
      { name: "Data Scientist", left: 0.92, right: 0.87, detail: "Selisih kecil" },
    ],
    takeaway: "Perbedaan yang terlihat menjadi titik awal review, bukan angka yang disembunyikan.",
  },
  capability: {
    kicker: "02 / CAPABILITIES",
    heading: "Roles alone don't tell the full story.",
    description: "Setiap work package dihubungkan ke skill dan area kompetensi. Buka detail untuk mengetahui mengapa capability diperlukan.",
    columns: ["Tersedia", "Dibutuhkan"],
    rows: [
      { name: "Data integration", left: 0.63, right: 0.82, detail: "ETL · Data quality" },
      { name: "Applied AI", left: 0.58, right: 0.77, detail: "Model evaluation" },
      { name: "Analytics", left: 0.67, right: 0.75, detail: "Dashboard · KPI" },
    ],
    takeaway: "Capability menjadi dasar diskusi staffing, bukan sekadar nama jabatan.",
  },
  ai: {
    kicker: "03 / AI ASSISTANCE",
    heading: "Explore effort before pricing it.",
    description: "Lihat bagaimana bantuan AI berpotensi mengubah effort tiap pekerjaan. Estimasi biaya berada di akhir keputusan.",
    columns: ["Baseline", "Dengan AI"],
    rows: [
      { name: "Engineering", left: 0.92, right: 0.72, detail: "Skenario pekerjaan rutin" },
      { name: "Documentation", left: 0.84, right: 0.63, detail: "Skenario dokumentasi" },
      { name: "Analytics", left: 0.73, right: 0.65, detail: "Skenario analitik" },
    ],
    takeaway: "Efisiensi adalah potensi kapasitas, bukan otomatis penghematan anggaran.",
  },
};

const steps = [
  { number: "01", label: "Understand", title: "Dokumen menjadi konteks", description: "Baca WBS, kebutuhan proyek, dan peran yang diajukan.", icon: FileSpreadsheet },
  { number: "02", label: "Estimate", title: "Hitung dengan dua metode", description: "UCP dan bottom-up memberi perspektif berbeda atas pekerjaan.", icon: BarChart3 },
  { number: "03", label: "Review", title: "Periksa setiap keputusan", description: "Telusuri alasan, asumsi, dan item yang perlu dikonfirmasi.", icon: SearchCheck },
  { number: "04", label: "Optimize", title: "Nilai peluang bantuan AI", description: "Bandingkan effort sebelum menilai skenario biaya.", icon: Sparkles },
];

function Mark() {
  return <span className="tln-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}

function ScenarioBars({ left, right, type }: { left: number; right: number; type: Perspective }) {
  const scale = type === "fte" ? 1.3 : 1;
  return (
    <div className="tln-scenario-bars" aria-label={"Perbandingan " + left.toLocaleString("id-ID") + " dan " + right.toLocaleString("id-ID")} role="img">
      <span style={{ width: String(Math.min(100, left / scale * 100)) + "%" }} />
      <span style={{ width: String(Math.min(100, right / scale * 100)) + "%" }} />
    </div>
  );
}

function ProductStory() {
  const [active, setActive] = useState<Perspective>("fte");
  const view = perspectives[active];
  const options: { value: Perspective; label: string }[] = [
    { value: "fte", label: "FTE & estimasi" },
    { value: "capability", label: "Capability" },
    { value: "ai", label: "AI opportunity" },
  ];

  return (
    <div className="tln-product-story">
      <div className="tln-product-top">
        <div><Mark /><strong>TalentLens</strong><span>DECISION INTELLIGENCE</span></div>
        <span className="tln-sample-pill">DATA ILUSTRATIF</span>
      </div>
      <div className="tln-product-tabs" role="tablist" aria-label="Perspektif contoh analisis">
        {options.map((tab, index) => (
          <button key={tab.value} id={"tln-tab-" + tab.value} type="button" role="tab"
            aria-selected={active === tab.value} aria-controls="tln-panel"
            tabIndex={active === tab.value ? 0 : -1}
            onClick={() => setActive(tab.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const next = options[(index + (event.key === "ArrowRight" ? 1 : options.length - 1)) % options.length].value;
              setActive(next);
              document.getElementById("tln-tab-" + next)?.focus();
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div id="tln-panel" role="tabpanel" aria-labelledby={"tln-tab-" + active} key={active} className="tln-product-panel">
        <div className="tln-product-narrative">
          <span className="tln-eyebrow">{view.kicker}</span>
          <h3>{view.heading}</h3>
          <p>{view.description}</p>
          <div className="tln-product-insight"><CheckCircle2 size={21} aria-hidden="true" /><span>{view.takeaway}</span></div>
        </div>
        <div className="tln-product-plot">
          <div className="tln-plot-heading">
            <strong>Workforce evidence</strong>
            <span>{view.columns[0]} <i /> {view.columns[1]}</span>
          </div>
          <div className="tln-plot-list">
            {view.rows.map((row) => (
              <div key={row.name} className="tln-plot-row">
                <div className="tln-plot-label"><strong>{row.name}</strong><span>{row.detail}</span></div>
                <ScenarioBars left={row.left} right={row.right} type={active} />
                <span className="tln-plot-numbers">
                  {active === "fte"
                    ? row.left.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " / " + row.right.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " FTE"
                    : Math.round(row.left * 100) + "% / " + Math.round(row.right * 100) + "%"}
                </span>
              </div>
            ))}
          </div>
          <small>Contoh fiktif untuk memperlihatkan tampilan. Hasil aktual dihitung dari dokumen dan parameter pengguna.</small>
        </div>
      </div>
    </div>
  );
}

function DecisionPreview() {
  return (
    <div className="tln-report" aria-label="Pratinjau ilustratif alur laporan TalentLens">
      <div className="tln-report-top">
        <div className="tln-report-icon"><Layers3 size={21} aria-hidden /></div>
        <div><span>PROJECT INTELLIGENCE / CONTOH</span><strong>Analitik layanan publik</strong></div>
        <span className="tln-live-pill">ILUSTRASI</span>
      </div>
      <div className="tln-report-feature">
        <div className="tln-report-intro">
          <div><span className="tln-report-caption">WORKFORCE ESTIMATE</span><h2>A clearer view of your team's needs.</h2></div>
          <span className="tln-report-index">01 — 04</span>
        </div>
        <div className="tln-report-legend"><span><i /> Use Case Points</span><span><i /> Bottom-up</span></div>
        {[
          { name: "Data Engineer", ucp: "1,12", bu: "1,07", u: 91, b: 86 },
          { name: "AI Engineer", ucp: "0,78", bu: "0,74", u: 63, b: 60 },
          { name: "Data Scientist", ucp: "0,92", bu: "0,87", u: 75, b: 70 },
        ].map((row) => (
          <div className="tln-report-row" key={row.name}>
            <div><strong>{row.name}</strong><span>Estimasi FTE rata-rata</span></div>
            <div className="tln-report-bars"><span style={{ width: row.u + "%" }} /><span style={{ width: row.b + "%" }} /></div>
            <div className="tln-report-values"><strong>{row.ucp}</strong><span>{row.bu}</span></div>
          </div>
        ))}
      </div>
      <div className="tln-report-bottom">
        <div><span className="tln-report-dot" /><p><strong>Review the evidence.</strong><span>Selisih estimasi dapat ditelusuri ke pekerjaan.</span></p></div>
        <div>WBS <ArrowRight size={15} aria-hidden /> REVIEW <ArrowRight size={15} aria-hidden /> AI <ArrowRight size={15} aria-hidden /> COST</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { run, start, status } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const reviews = run?.breakdown.filter((item) => item.needs_review).length ?? 0;

  async function startSample() {
    if (status === "running") return;
    router.push("/proses");
    await start(true);
  }

  return (
    <div className="tln-site">
      <div className="tln-container">
        <header className="tln-header">
          <Link href="/" className="tln-logo" aria-label="TalentLens beranda"><Mark /><strong>TalentLens</strong><span>.</span></Link>
          <nav className={menuOpen ? "tln-main-nav is-open" : "tln-main-nav"} aria-label="Navigasi utama">
            <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>Cara kerja</a>
            <Link href="/metodologi" onClick={() => setMenuOpen(false)}>Metodologi</Link>
          </nav>
          <Link href="/validasi" className="tln-nav-cta" aria-label="Buka aplikasi">Buka aplikasi <ArrowUpRight size={17} aria-hidden /></Link>
          <button type="button" className="tln-menu-button" aria-label={menuOpen ? "Tutup navigasi" : "Buka navigasi"}
            aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </header>
        <main>
          <section className="tln-hero" aria-labelledby="tln-hero-heading">
            <div className="tln-hero-copy">
              <span className="tln-eyebrow"><span className="tln-eyebrow-line" /> WORKFORCE DECISION INTELLIGENCE</span>
              <h1 id="tln-hero-heading">The right team starts with <em>the right evidence.</em></h1>
              <p className="tln-hero-lead">Dari WBS hingga keputusan talent. Temukan kebutuhan FTE, capability, dan peluang bantuan AI melalui analisis yang dapat dijelaskan.</p>
              <div className="tln-hero-actions">
                <Link href="/validasi" className="tln-primary-cta">Mulai analisis <ArrowUpRight size={20} aria-hidden /></Link>
                <button type="button" className="tln-secondary-cta" onClick={startSample} disabled={status === "running"}>
                  <Play size={17} aria-hidden /> {status === "running" ? "Memproses contoh…" : "Coba data contoh"}
                </button>
              </div>
              <div className="tln-hero-meta">
                <span><ShieldCheck size={17} aria-hidden /> Built for traceability</span>
                <span><CheckCircle2 size={17} aria-hidden /> Human-in-the-loop review</span>
              </div>
              {run && <Link href="/hasil/ringkasan" className="tln-resume">
                Lanjutkan hasil terakhir{reviews > 0 ? " · " + reviews + " item perlu review" : ""}
                <ArrowRight size={17} aria-hidden />
              </Link>}
            </div>
            <DecisionPreview />
          </section>
          <div className="tln-signal"><span>01 / INPUT</span><ArrowRight size={16} aria-hidden /><span>02 / ESTIMATE</span><ArrowRight size={16} aria-hidden /><span>03 / REVIEW</span><ArrowRight size={16} aria-hidden /><span>04 / AI SCENARIO</span><ArrowRight size={16} aria-hidden /><span>05 / COST</span></div>

          <section className="tln-platform" id="platform" aria-labelledby="tln-platform-heading">
            <div className="tln-section-heading">
              <div><span className="tln-eyebrow">THE PLATFORM / 01</span><h2 id="tln-platform-heading">From project scope to <em>workforce clarity.</em></h2></div>
              <p>Angka yang berdiri sendiri tidak cukup. Lihat cara TalentLens menghubungkan pekerjaan, estimasi, review, dan alternatif keputusan dalam satu alur.</p>
            </div>
            <ProductStory />
          </section>

          <section className="tln-how" id="how" aria-labelledby="tln-how-heading">
            <div className="tln-section-heading">
              <div><span className="tln-eyebrow">HOW IT WORKS / 02</span><h2 id="tln-how-heading">Everything has a reason.</h2></div>
              <p>Agent membantu menafsirkan konteks. Engine menghitung. Manusia meninjau dan menentukan keputusan final.</p>
            </div>
            <div className="tln-steps">
              {steps.map((step) => (
                <article key={step.number}>
                  <div className="tln-step-top"><span>{step.number}</span><step.icon size={25} strokeWidth={1.7} aria-hidden /></div>
                  <span className="tln-step-label">{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="tln-evidence" aria-labelledby="tln-evidence-heading">
            <div className="tln-evidence-copy">
              <span className="tln-eyebrow">TRACEABILITY / 03</span>
              <h2 id="tln-evidence-heading">Beyond the number. <em>See the reasoning.</em></h2>
              <p>Ketika hasil perlu diperiksa, kamu dapat menelusuri item WBS, alasan klasifikasi, alokasi FTE, capability, dan temuan reviewer—tanpa kehilangan konteks proyek.</p>
              <Link href="/metodologi">Pelajari metodologinya <ArrowUpRight size={18} aria-hidden /></Link>
            </div>
            <div className="tln-evidence-detail">
              <div className="tln-evidence-head"><span>SAMPLE REVIEW / 2.1.2</span><span>CONTOH ILUSTRATIF</span></div>
              <h3>Integrasi data pengaduan</h3>
              <div className="tln-evidence-items">
                <div><span>Role terkait</span><strong>Data Engineer</strong></div>
                <div><span>Klasifikasi</span><strong>Average complexity</strong></div>
                <div><span>Alasan review</span><strong>Validasi effort integrasi dan asumsi sumber data.</strong></div>
              </div>
              <div className="tln-evidence-foot"><SearchCheck size={19} aria-hidden /><span>Review berfokus pada bukti, bukan sekadar persetujuan angka.</span></div>
            </div>
          </section>
        </main>
      </div>
      <section className="tln-cta">
        <div className="tln-container tln-cta-layout">
          <div><span className="tln-eyebrow">THE NEXT DECISION</span><h2>Build a plan your team can <em>stand behind.</em></h2></div>
          <div><p>Mulai dari WBS proyek, telaah rekomendasi, lalu bandingkan kebutuhan dan potensi biaya dengan bantuan AI sebagai langkah terakhir.</p>
            <Link href="/validasi">Mulai dengan dokumen <ArrowUpRight size={20} aria-hidden /></Link>
          </div>
        </div>
      </section>
      <footer className="tln-container tln-footer">
        <Link href="/" className="tln-logo"><Mark /><strong>TalentLens</strong><span>.</span></Link>
        <p>Workforce intelligence, built by Adryan Rizky Alviano</p>
        <div><Link href="/tentang">Tentang</Link><a href="https://github.com/adryanra97/talent-estimation-agent">GitHub</a></div>
      </footer>
    </div>
  );
}
