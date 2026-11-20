"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileText,
  Menu,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

type LensId = "workforce" | "capability" | "ai";
type Lens = {
  index: string;
  label: string;
  headline: string;
  explanation: string;
  axes: [string, string];
  rows: { name: string; a: number; b: number; detail: string }[];
  annotation: string;
};
const lenses: Record<LensId, Lens> = {
  workforce: {
    index: "01", label: "Workforce", headline: "Two methods. One more confident decision.",
    explanation: "Baca perbedaan estimasi UCP dan bottom-up, kemudian telusuri pekerjaan yang mendasarinya.",
    axes: ["UCP", "Bottom-up"],
    rows: [
      { name: "Data Engineer", a: 1.12, b: 1.07, detail: "Review 1 pekerjaan" },
      { name: "AI Engineer", a: 0.78, b: 0.74, detail: "Selisih kecil" },
      { name: "Data Scientist", a: 0.92, b: 0.87, detail: "Selisih kecil" },
    ],
    annotation: "Kedua metode dihitung secara independen. Data di layar ini adalah ilustrasi, bukan hasil proyek pengguna.",
  },
  capability: {
    index: "02", label: "Capability", headline: "People have roles. Work needs skills.",
    explanation: "Jelajahi capability yang relevan bagi setiap paket pekerjaan, berikut alasan di balik pemetaannya.",
    axes: ["Ketersediaan", "Kebutuhan"],
    rows: [
      { name: "Data Integration", a: 63, b: 82, detail: "Data pipeline" },
      { name: "Applied AI", a: 58, b: 77, detail: "Model evaluation" },
      { name: "Analytics", a: 67, b: 75, detail: "Reporting & insights" },
    ],
    annotation: "Persentase ilustratif untuk mendemonstrasikan perspektif capability. Bukan pengukuran skill nyata.",
  },
  ai: {
    index: "03", label: "AI opportunity", headline: "Find the effort AI can actually assist.",
    explanation: "Lihat tugas yang berpotensi dibantu AI dan bagaimana perubahan effort memengaruhi keputusan tenaga kerja.",
    axes: ["Baseline", "Dengan AI"],
    rows: [
      { name: "Engineering", a: 92, b: 72, detail: "Automation support" },
      { name: "Documentation", a: 84, b: 63, detail: "Drafting support" },
      { name: "Analytics", a: 73, b: 65, detail: "Analysis support" },
    ],
    annotation: "Skenario AI mengukur potensi perubahan effort, bukan penghematan biaya yang sudah terealisasi.",
  },
};

function BrandMark() {
  return <span aria-hidden="true" className="tlw-brand-glyph"><span /><span /><span /></span>;
}

function WorkSignal() {
  return (
    <div className="tlw-signal-art" aria-label="Visualisasi ilustratif aliran pekerjaan menuju capability, estimasi, dan review" role="img">
      <div className="tlw-signal-grain" aria-hidden="true" />
      <svg className="tlw-signal-network" viewBox="0 0 600 660" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="tlw-flow" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5f94ff" /><stop offset=".5" stopColor="#6bcfe4" /><stop offset="1" stopColor="#b2d9ff" /></linearGradient>
          <radialGradient id="tlw-halo"><stop stopColor="#3978e8" stopOpacity=".57" /><stop offset=".7" stopColor="#3978e8" stopOpacity=".12" /><stop offset="1" stopColor="#3978e8" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="355" cy="319" rx="265" ry="265" fill="url(#tlw-halo)" />
        <circle cx="355" cy="318" r="193" fill="none" stroke="#7cb9e8" strokeOpacity=".15" strokeWidth="1" />
        <circle cx="355" cy="318" r="145" fill="none" stroke="#a9d7ff" strokeOpacity=".13" strokeWidth="1" strokeDasharray="2 9" />
        <path className="tlw-flow-path" d="M48 151 C180 151 170 318 338 318 S499 492 577 492" fill="none" stroke="url(#tlw-flow)" strokeWidth="2.2" />
        <path className="tlw-flow-path tlw-flow-delay" d="M36 363 C160 363 173 318 338 318 S488 174 566 174" fill="none" stroke="#a4baff" strokeOpacity=".73" strokeWidth="1.6" />
        <path d="M54 542 C172 542 203 318 338 318 S502 356 583 355" fill="none" stroke="#6f9fb8" strokeOpacity=".38" strokeWidth="1" />
        <path d="M338 318 C301 235 323 199 341 161" stroke="#9ac8f7" strokeOpacity=".24" fill="none" />
        <g fill="#9ce8f3"><circle cx="48" cy="151" r="5"/><circle cx="36" cy="363" r="5"/><circle cx="54" cy="542" r="5"/><circle cx="577" cy="492" r="5"/></g>
        <circle cx="338" cy="318" r="13" fill="#9be2ed" opacity=".1" /><circle cx="338" cy="318" r="5" fill="#bef5ff" />
        <circle cx="338" cy="318" r="31" fill="none" stroke="#e2f4ff" strokeOpacity=".52" strokeWidth="1.2" />
      </svg>
      <div className="tlw-signal-note tlw-signal-note-a"><span>PROJECT INPUT</span><strong>28 work packages</strong><small>WBS · scope · assumptions</small></div>
      <div className="tlw-signal-note tlw-signal-note-b"><span>CAPABILITY MAPPING</span><strong>12 skills identified</strong><small>Roles · expertise · allocation</small></div>
      <div className="tlw-signal-number"><span>ESTIMATED WORKFORCE</span><strong>2.82<em> FTE</em></strong><div><b /> UCP baseline <span>·</span> illustrative</div></div>
      <div className="tlw-signal-note tlw-signal-note-c"><span>HUMAN REVIEW</span><strong>1 item flagged</strong><small>Evidence ready to inspect</small></div>
      <div className="tlw-signal-corner tlw-corner-a" aria-hidden="true">+</div>
      <div className="tlw-signal-corner tlw-corner-b" aria-hidden="true">+</div>
      <div className="tlw-signal-index">TALENTLENS / DECISION SYSTEM <span>—</span> 01</div>
    </div>
  );
}

function CompareRows({ lens, id }: { lens: Lens; id: LensId }) {
  const cap = id === "workforce" ? 1.35 : 100;
  const value = (n: number) => id === "workforce" ? n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " FTE" : n + "%";
  return (
    <div className="tlw-compare">
      <div className="tlw-compare-heading"><strong>Role-level evidence</strong><div><span className="tlw-legend-first" />{lens.axes[0]}<span className="tlw-legend-second" />{lens.axes[1]}</div></div>
      {lens.rows.map(row => (
        <div key={row.name} className="tlw-compare-row">
          <div className="tlw-compare-name"><strong>{row.name}</strong><span>{row.detail}</span></div>
          <div className="tlw-compare-bars">
            <span role="img" aria-label={lens.axes[0] + " " + value(row.a)}><i style={{ width: (row.a / cap * 100) + "%" }} /></span>
            <span role="img" aria-label={lens.axes[1] + " " + value(row.b)}><i style={{ width: (row.b / cap * 100) + "%" }} /></span>
          </div>
          <div className="tlw-compare-values"><strong>{value(row.a)}</strong><span>{value(row.b)}</span></div>
        </div>
      ))}
      <p className="tlw-compare-footnote">{lens.annotation}</p>
    </div>
  );
}

function ReportStage() {
  const [selected, setSelected] = useState<LensId>("workforce");
  const tabs: LensId[] = ["workforce", "capability", "ai"];
  const content = lenses[selected];
  return (
    <div className="tlw-report-stage">
      <div className="tlw-report-stage-top">
        <div><BrandMark /><span>TALENTLENS <b>/</b> INSIGHT STUDIO</span></div>
        <span>PRODUCT PREVIEW <i>•</i> SAMPLE DATA</span>
      </div>
      <div className="tlw-report-stage-body">
        <div className="tlw-report-toolbar">
          <div><span>PROJECT 001 / EXAMPLE</span><strong>Public service analytics platform</strong></div>
          <span className="tlw-status">EXAMPLE RUN</span>
        </div>
        <div className="tlw-report-tabs" role="tablist" aria-label="Jelajahi contoh analisis">
          {tabs.map((id, index) => (
            <button key={id} id={"tlw-tab-" + id} type="button" role="tab" aria-selected={selected === id}
              aria-controls="tlw-tab-panel" tabIndex={selected === id ? 0 : -1}
              onClick={() => setSelected(id)}
              onKeyDown={e => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next = tabs[(index + (e.key === "ArrowRight" ? 1 : 2)) % 3];
                setSelected(next); document.getElementById("tlw-tab-" + next)?.focus();
              }}>{content.index === lenses[id].index && <span className="tlw-active-dot" />}{lenses[id].label}</button>
          ))}
        </div>
        <div id="tlw-tab-panel" role="tabpanel" aria-labelledby={"tlw-tab-" + selected} className="tlw-report-panel" key={selected}>
          <div className="tlw-report-story">
            <span>0{tabs.indexOf(selected) + 1} / A BETTER QUESTION</span>
            <h3>{content.headline}</h3>
            <p>{content.explanation}</p>
            <div className="tlw-report-proof"><Check size={18} aria-hidden /><span>Inspectable assumptions, transparent outcomes.</span></div>
          </div>
          <CompareRows lens={content} id={selected} />
        </div>
      </div>
    </div>
  );
}

const phases = [
  { index: "01", name: "Decode the scope.", description: "Dari WBS dan dokumen pendukung menjadi struktur pekerjaan serta capability yang bisa ditinjau.", detail: "INPUT → CAPABILITY" },
  { index: "02", name: "Challenge the estimate.", description: "UCP dan bottom-up dihitung terpisah. Reviewer menyoroti pekerjaan dan asumsi yang membutuhkan perhatian.", detail: "ESTIMATE → HUMAN REVIEW" },
  { index: "03", name: "Design a better scenario.", description: "Pertimbangkan bantuan AI per tugas. Baru setelah itu lihat implikasi FTE dan estimasi biaya.", detail: "AI OPPORTUNITY → COST" },
];

function ReviewDetail() {
  return (
    <div className="tlw-review-mock">
      <div className="tlw-review-head"><span>REVIEW QUEUE <b>/</b> EXAMPLE DATA</span><span>01 FLAGGED</span></div>
      <div className="tlw-review-item-top">
        <span>WBS 2.1.2</span><span className="tlw-review-flag">Needs attention</span>
      </div>
      <h3>Integrasi data pengaduan</h3>
      <p>Data Engineer <span>—</span> Average complexity</p>
      <div className="tlw-review-rule" />
      <div className="tlw-review-field"><span>Classification rationale</span><strong>Integrasi beberapa sumber data memerlukan validasi kompleksitas dan dependensi.</strong></div>
      <details className="tlw-review-details">
        <summary>Inspect review evidence <ChevronDown size={19} aria-hidden /></summary>
        <div><strong>Review note</strong><p>Konfirmasi jumlah endpoint, kualitas data, dan penanganan error sebelum memutuskan alokasi effort final.</p><strong>Next action</strong><p>Buka breakdown WBS, periksa klasifikasi, dan jalankan review ulang jika ada perubahan.</p></div>
      </details>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { run, status, start } = useStore();
  const [navOpen, setNavOpen] = useState(false);
  const flagged = run?.breakdown.filter(item => item.needs_review).length ?? 0;

  async function runSample() {
    if (status === "running") return;
    router.push("/proses");
    await start(true);
  }

  return <div className="tlw-site">
    <section className="tlw-night">
      <div className="tlw-night-light" aria-hidden="true" />
      <div className="tlw-wide">
        <header className="tlw-header">
          <Link href="/" className="tlw-logo" aria-label="TalentLens homepage"><BrandMark /><strong>talentlens</strong><span>.</span></Link>
          <nav className={navOpen ? "tlw-nav is-open" : "tlw-nav"} aria-label="Navigasi utama">
            <a href="#platform" onClick={() => setNavOpen(false)}>Platform</a>
            <a href="#how" onClick={() => setNavOpen(false)}>Approach</a>
            <Link href="/metodologi" onClick={() => setNavOpen(false)}>Methodology</Link>
          </nav>
          <Link href="/validasi" className="tlw-header-link">Open studio <ArrowUpRight size={18} aria-hidden /></Link>
          <button type="button" className="tlw-nav-toggle" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen} aria-label={navOpen ? "Tutup menu" : "Buka menu"}>
            {navOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
        <main>
          <section className="tlw-hero" aria-labelledby="tlw-title">
            <div className="tlw-hero-copy">
              <div className="tlw-kicker"><span /> WORKFORCE DECISION INTELLIGENCE</div>
              <h1 id="tlw-title">The work is complex.<br /><em>The decision shouldn't be.</em></h1>
              <p>From project scope to a workforce you can explain. TalentLens mengubah WBS menjadi estimasi FTE, capability, review, dan skenario bantuan AI—dengan alasan yang dapat ditelusuri.</p>
              <div className="tlw-hero-actions">
                <Link href="/validasi" className="tlw-button-primary">Start an analysis <ArrowUpRight size={20} aria-hidden /></Link>
                <button type="button" onClick={runSample} disabled={status === "running"} className="tlw-button-ghost"><Play size={16} aria-hidden />{status === "running" ? "Processing…" : "Explore the demo"}</button>
              </div>
              {run && <Link className="tlw-resume" href="/hasil/ringkasan">Continue your last report {flagged > 0 ? " · " + flagged + " to review" : ""}<ArrowRight size={16} aria-hidden /></Link>}
              <div className="tlw-hero-bottom"><span>01 / INTELLIGENCE IN MOTION</span><a href="#platform">Discover the platform <ArrowDownRight size={17} aria-hidden /></a></div>
            </div>
            <WorkSignal />
          </section>
        </main>
      </div>
    </section>
    <div className="tlw-transition-bar" aria-label="Decision process"><span>UNDERSTAND THE WORK</span><i /> <span>ESTIMATE THE EFFORT</span><i /><span>REVIEW THE EVIDENCE</span><i /><span>OPTIMIZE THE SCENARIO</span></div>

    <section className="tlw-platform" id="platform">
      <div className="tlw-wide">
        <div className="tlw-section-head">
          <span>01 / THE PLATFORM</span>
          <div><h2>See beyond<br /><em>the headcount.</em></h2><p>Keputusan talent yang baik dimulai dari pemahaman pekerjaan. Jelajahi contoh cara TalentLens menghubungkan estimasi, capability, dan peluang AI.</p></div>
        </div>
        <ReportStage />
      </div>
    </section>

    <section className="tlw-philosophy" id="how">
      <div className="tlw-wide">
        <div className="tlw-philosophy-hero"><span>02 / HOW IT WORKS</span><h2>An estimate is <em>not</em> a decision.</h2><p>A decision needs context, evidence, and a way to challenge the assumptions behind it.</p></div>
        <div className="tlw-phases">
          {phases.map(phase => (
            <article className="tlw-phase" key={phase.index}>
              <div className="tlw-phase-index">{phase.index}<span> / 03</span></div>
              <div><h3>{phase.name}</h3><p>{phase.description}</p></div>
              <span className="tlw-phase-detail">{phase.detail}</span>
              <ArrowUpRight size={24} strokeWidth={1.5} aria-hidden />
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="tlw-review-section">
      <div className="tlw-wide tlw-review-layout">
        <div className="tlw-review-story">
          <span>03 / BUILT FOR ACCOUNTABILITY</span>
          <h2>Every number<br />has a <em>why.</em></h2>
          <p>Jika satu hasil perlu diperiksa, jangan cari alasan di puluhan tabel. TalentLens membawa item WBS, klasifikasi, capability, asumsi, dan catatan reviewer ke dalam alur review yang jelas.</p>
          <Link href="/metodologi">Explore our methodology <ArrowUpRight size={19} aria-hidden /></Link>
          <div className="tlw-review-quote">"Intelligence you can question, not just consume."</div>
        </div>
        <ReviewDetail />
      </div>
    </section>

    <section className="tlw-final">
      <div className="tlw-wide tlw-final-layout">
        <div><span>04 / YOUR NEXT PROJECT</span><h2>Build your next team<br /><em>on better evidence.</em></h2></div>
        <div><p>Ubah WBS menjadi keputusan talent yang bisa dijelaskan. Tinjau effort, lihat peluang AI, lalu bandingkan biaya sebagai langkah terakhir.</p><Link href="/validasi">Begin with your WBS <ArrowUpRight size={20} aria-hidden /></Link></div>
      </div>
    </section>
    <footer className="tlw-footer">
      <div className="tlw-wide"><Link href="/" className="tlw-logo"><BrandMark /><strong>talentlens</strong><span>.</span></Link><span>Workforce decision intelligence · by Adryan Rizky Alviano</span><div><Link href="/tentang">About</Link><a href="https://github.com/adryanra97/talent-estimation-agent">GitHub</a></div></div>
    </footer>
  </div>;
}
