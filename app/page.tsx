"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, FileSpreadsheet, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

type PreviewMode = "workforce" | "capability" | "ai";

const previews: Record<PreviewMode, {
  roles: string[]; current: number[]; estimate: number[]; values: string[];
  currentLabel: string; estimateLabel: string; highlight: string; unit: string;
  insight: string; caption: string;
}> = {
  workforce: {
    roles: ["Data Engineer", "AI Engineer", "Data Scientist"],
    current: [69, 37, 62], estimate: [86, 60, 48],
    values: ["2,6 FTE", "1,8 FTE", "1,4 FTE"],
    currentLabel: "Diminta", estimateLabel: "Estimasi", highlight: "2,1", unit: "FTE",
    insight: "Selisih kebutuhan menjadi lebih mudah dipahami.",
    caption: "Telusuri perbedaan dari estimasi sampai ke item WBS.",
  },
  capability: {
    roles: ["Data platform", "Applied AI", "Analytics"],
    current: [65, 50, 82], estimate: [91, 80, 70],
    values: ["Tinggi", "Tinggi", "Sedang"],
    currentLabel: "Ketersediaan", estimateLabel: "Kebutuhan", highlight: "16", unit: "skills",
    insight: "Perencanaan talent dimulai dari capability.",
    caption: "Setiap capability terhubung dengan pekerjaan asalnya.",
  },
  ai: {
    roles: ["Engineering", "Documentation", "Analytics"],
    current: [90, 86, 75], estimate: [67, 59, 66],
    values: ["23%", "27%", "12%"],
    currentLabel: "Baseline effort", estimateLabel: "Skenario AI", highlight: "21", unit: "%",
    insight: "Bantuan AI dinilai per jenis pekerjaan.",
    caption: "Potensi efisiensi dihitung sebagai skenario terpisah.",
  },
};

function IntelligenceFlow() {
  return (
    <div className="tlm-flow" aria-label="Ilustrasi konsep alur dari dokumen menuju keputusan talent">
      <div className="tlm-flow-top"><span>TALENTLENS / SYSTEM VIEW</span><span><i /> ALUR ILUSTRATIF</span></div>
      <div className="tlm-flow-head"><strong>Inside the intelligence engine.</strong><small>Structured analysis. Explainable decisions.</small></div>
      <div className="tlm-flow-stage">
        <svg viewBox="0 0 400 310" preserveAspectRatio="none" className="tlm-flow-wire" aria-hidden="true">
          <path d="M80 77 L80 111 Q80 127 96 127 L200 127 L200 140 M320 77 L320 111 Q320 127 304 127 L200 127 M200 209 L200 241 Q200 256 180 256 L95 256 L95 266 M200 209 L200 241 Q200 256 220 256 L305 256 L305 266" />
          <path className="tlm-flow-travel" d="M80 77 L80 111 Q80 127 96 127 L200 127 L200 140 L200 209 L200 241 Q200 256 220 256 L305 256 L305 266" />
        </svg>
        <div className="tlm-flow-box is-input"><span>01 / INPUT</span><strong>Project scope</strong><small>WBS · documents</small></div>
        <div className="tlm-flow-box is-context"><span>02 / CONTEXT</span><strong>Capabilities</strong><small>Role · skill mapping</small></div>
        <div className="tlm-flow-box is-estimate"><span>03 / REASON</span><strong>Agent estimation</strong><small>UCP + bottom-up</small></div>
        <div className="tlm-flow-box is-review"><span>04 / VALIDATE</span><strong>Reviewer agent</strong><small>Assumptions · gaps</small></div>
        <div className="tlm-flow-box is-decision"><span>05 / OUTPUT</span><strong>Decision brief</strong><small>Traceable results</small></div>
      </div>
      <div className="tlm-flow-footer"><span>Each stage is traceable</span><span>AI judges · Code calculates</span></div>
    </div>
  );
}

function ProductPreview() {
  const [mode, setMode] = useState<PreviewMode>("workforce");
  const data = previews[mode];
  const modes: { id: PreviewMode; label: string }[] = [
    { id: "workforce", label: "Workforce" }, { id: "capability", label: "Capability" }, { id: "ai", label: "AI opportunity" },
  ];
  return (
    <div className="tlm-product">
      <div className="tlm-product-top"><strong>Talent<span>Lens</span></strong><span>INTELLIGENCE REPORT</span><small><i /> DATA ILUSTRATIF</small></div>
      <div className="tlm-product-grid">
        <div className="tlm-product-left">
          <p className="tlm-label">PROJECT INTELLIGENCE / SAMPLE REPORT</p>
          <h3>The workforce,<br /><em>quantified.</em></h3>
          <p className="tlm-product-description">Dari kebutuhan FTE sampai peluang bantuan AI. Jelajahi tiga perspektif pada data contoh.</p>
          <div className="tlm-product-tabs" role="tablist" aria-label="Perspektif laporan contoh">
            {modes.map(({id,label}) => <button key={id} id={`tlm-tab-${id}`} type="button" role="tab"
              aria-selected={mode === id} aria-controls="tlm-preview-data"
              tabIndex={mode === id ? 0 : -1} onClick={() => setMode(id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const next = modes[(modes.findIndex((m) => m.id === id) + (event.key === "ArrowRight" ? 1 : -1) + modes.length) % modes.length].id;
                setMode(next);
                document.getElementById(`tlm-tab-${next}`)?.focus();
              }}>{label}</button>)}
          </div>
          <div id="tlm-preview-data" role="tabpanel" aria-labelledby={`tlm-tab-${mode}`} className="tlm-product-data" key={mode}>
            {data.roles.map((role, i) => (
              <div className="tlm-chart-row" key={role}>
                <span>{role}</span>
                <div className="tlm-chart-pair">
                  <div className="tlm-chart-track"><i style={{width:`${data.current[i]}%`}} /></div>
                  <div className="tlm-chart-track"><i className="is-estimate" style={{width:`${data.estimate[i]}%`}} /></div>
                </div>
                <strong>{data.values[i]}</strong>
              </div>
            ))}
          </div>
          <div className="tlm-chart-legend"><span><i />{data.currentLabel}</span><span><i className="is-estimate" />{data.estimateLabel}</span></div>
        </div>
        <aside className="tlm-product-insight">
          <p className="tlm-label">DECISION INSIGHT</p>
          <div className="tlm-insight-number">{data.highlight} <span>{data.unit}</span></div>
          <small>Nilai contoh, bukan hasil analisis nyata</small>
          <div className="tlm-insight-bottom"><span>KEY OBSERVATION / 01</span><h4>{data.insight}</h4><p>{data.caption}</p></div>
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { run, status, start } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  async function runDemo() {
    if (status === "running") return;
    router.push("/proses");
    await start(true);
  }
  return (
    <>
      <div className="tlm-container">
        <header className="tlm-header">
          <Link href="/" className="tlm-brand" aria-label="TalentLens beranda"><span className="tlm-logo"><i /></span>TalentLens<sup>®</sup></Link>
          <nav className={`tlm-navigation ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi beranda">
            <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
            <a href="#approach" onClick={() => setMenuOpen(false)}>Cara kerja</a>
            <Link href="/metodologi" onClick={() => setMenuOpen(false)}>Metodologi</Link>
          </nav>
          <Link className="tlm-header-cta" href="/validasi">Buka aplikasi <ArrowUpRight size={17} aria-hidden /></Link>
          <button className="tlm-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen}>{menuOpen ? "Tutup" : "Menu"}</button>
        </header>
        <main>
          <section className="tlm-hero" aria-labelledby="tlm-hero-heading">
            <div className="tlm-eyebrow-row"><span><b>TL / 01</b> WORKFORCE DECISION INTELLIGENCE</span><span>FROM SCOPE TO STRATEGY</span></div>
            <div className="tlm-hero-grid">
              <div className="tlm-hero-content">
                <h1 id="tlm-hero-heading">Understand<br />the work.<br /><em>Design the<br />workforce.</em></h1>
                <p>TalentLens menerjemahkan scope proyek menjadi kebutuhan talent yang terukur—dari capability, estimasi FTE, hingga peluang kolaborasi manusia dan AI.</p>
                <div className="tlm-hero-actions">
                  <Link href="/validasi" className="tlm-primary">Mulai analisis <ArrowUpRight size={18} aria-hidden /></Link>
                  <a href="#approach" className="tlm-text-link">Lihat cara kerjanya <ArrowDownRight size={16} aria-hidden /></a>
                </div>
                <div className="tlm-hero-note"><span /> <strong>From documents to decisions.</strong> Every insight, traceable.</div>
                {run && <Link href="/hasil/ringkasan" className="tlm-resume">Lanjutkan analisis terakhir <ArrowRight size={15} aria-hidden /></Link>}
              </div>
              <IntelligenceFlow />
            </div>
          </section>
          <section className="tlm-pillars" id="approach" aria-label="Pendekatan TalentLens">
            {[
              ["01 / UNDERSTAND", "Mulai dari pekerjaan.", "WBS dan dokumen menjadi konteks keputusan, bukan sekadar lampiran."],
              ["02 / QUANTIFY", "Hitung dari dua perspektif.", "Use Case Points dan bottom-up memperjelas selisih kebutuhan."],
              ["03 / EXPLAIN", "Putuskan dengan bukti.", "Dari kesimpulan eksekutif sampai alasan tiap work package."],
            ].map(([number,title,description]) => <div key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></div>)}
          </section>
          <section className="tlm-showcase" id="platform">
            <div className="tlm-label">02 / THE INTELLIGENCE WORKSPACE</div>
            <div className="tlm-showcase-head"><h2>From complex data to <em>clear decisions.</em></h2>
              <p>Angka saja tidak cukup. TalentLens memperlihatkan apa yang mendorong setiap keputusan, dengan detail yang tetap dapat ditelusuri hingga ke pekerjaan aslinya.</p>
            </div>
            <ProductPreview />
            <p className="tlm-disclaimer">Seluruh angka di preview bersifat fiktif untuk memperlihatkan alur produk.</p>
          </section>
        </main>
      </div>
      <section className="tlm-closing">
        <div className="tlm-container tlm-closing-content">
          <div><p className="tlm-label">03 / YOUR NEXT DECISION</p><h2>Build the team<br />the work <em>actually needs.</em></h2></div>
          <div><p>Mulai dari scope proyek, periksa rekomendasi agent, lalu bandingkan kapasitas dan biaya setelah menilai peluang bantuan AI.</p>
            <Link href="/validasi">Mulai dengan dokumen <ArrowUpRight size={17} aria-hidden /></Link>
            <button type="button" onClick={runDemo} disabled={status === "running"}><Play size={14} aria-hidden /> {status === "running" ? "Memproses contoh…" : "Coba data contoh"}</button>
          </div>
        </div>
      </section>
      <footer className="tlm-container tlm-footer"><span>TalentLens® · Workforce Decision Intelligence</span><span>Built by Adryan Rizky Alviano · <Link href="/tentang">Tentang</Link> · <a href="https://github.com/adryanra97/talent-estimation-agent">GitHub</a></span></footer>
    </>
  );
}
