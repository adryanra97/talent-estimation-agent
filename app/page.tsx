"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

type Lens = "workforce" | "capability" | "ai";

const lenses: Record<Lens, {
  eyebrow: string; title: string; value: string; unit: string;
  description: string; first: string; second: string;
  roles: { name: string; before: number; after: number; value: string }[];
}> = {
  workforce: {
    eyebrow: "01 / WORKFORCE ESTIMATION",
    title: "Know what the work really needs.",
    value: "0.14", unit: "FTE delta",
    description: "Bandingkan dua metode independen pada data ilustratif. Selisih pada proyek sebenarnya tetap ditampilkan apa adanya dan dapat ditelusuri hingga item WBS.",
    first: "UCP", second: "Bottom-up",
    roles: [
      { name: "Data Engineer", before: 88, after: 84, value: "1,12 / 1,07 FTE" },
      { name: "AI Engineer", before: 61, after: 58, value: "0,78 / 0,74 FTE" },
      { name: "Data Scientist", before: 72, after: 68, value: "0,92 / 0,87 FTE" },
    ],
  },
  capability: {
    eyebrow: "02 / CAPABILITY MAPPING",
    title: "Go beyond job titles.",
    value: "16", unit: "skills",
    description: "Periksa capability yang dibutuhkan masing-masing work package dan alasan pemetaannya.",
    first: "Ketersediaan", second: "Kebutuhan",
    roles: [
      { name: "Data platform", before: 60, after: 88, value: "Tinggi" },
      { name: "Applied AI", before: 47, after: 77, value: "Tinggi" },
      { name: "Analytics", before: 83, after: 69, value: "Sedang" },
    ],
  },
  ai: {
    eyebrow: "03 / AI-ASSISTED SCENARIO",
    title: "What could AI change?",
    value: "21", unit: "% effort",
    description: "Skenario bantuan AI dihitung per tugas, lalu menjadi masukan untuk perbandingan biaya di akhir.",
    first: "Baseline effort", second: "Dengan bantuan AI",
    roles: [
      { name: "Engineering", before: 90, after: 66, value: "23%" },
      { name: "Documentation", before: 87, after: 60, value: "27%" },
      { name: "Analytics", before: 75, after: 65, value: "12%" },
    ],
  },
};

function IntelligenceOrbit() {
  return (
    <figure className="tlx-orbit" aria-label="Ilustrasi alur: dokumen WBS dianalisis menjadi capability, estimasi FTE, review, peluang AI, dan keputusan biaya">
      <div className="tlx-orbit-rail tlx-orbit-rail-one" aria-hidden />
      <div className="tlx-orbit-rail tlx-orbit-rail-two" aria-hidden />
      <div className="tlx-orbit-rail tlx-orbit-rail-three" aria-hidden />
      <div className="tlx-orbit-center">
        <div className="tlx-orbit-glow" aria-hidden />
        <span className="tlx-orbit-mark">T<span>✦</span>L</span>
        <strong>Intelligence<br />at work.</strong>
      </div>
      <div className="tlx-orbit-node tlx-node-wbs"><span>01 / INPUT</span><strong>Project scope</strong><small>WBS + documents</small></div>
      <div className="tlx-orbit-node tlx-node-skills"><span>02 / MAP</span><strong>Capabilities</strong><small>Role + skill</small></div>
      <div className="tlx-orbit-node tlx-node-estimate"><span>03 / ESTIMATE</span><strong>Two methods</strong><small>UCP · Bottom-up</small></div>
      <div className="tlx-orbit-node tlx-node-review"><span>04 / VERIFY</span><strong>Human review</strong><small>Trace every decision</small></div>
      <div className="tlx-orbit-node tlx-node-ai"><span>05 / EXPLORE</span><strong>AI opportunity</strong><small>Compare scenarios</small></div>
      <div className="tlx-orbit-spark tlx-spark-one" aria-hidden>✳</div>
      <div className="tlx-orbit-spark tlx-spark-two" aria-hidden>✴</div>
      <figcaption>Illustrative product flow, not a live agent status.</figcaption>
    </figure>
  );
}

function InteractiveEvidence() {
  const [lens, setLens] = useState<Lens>("workforce");
  const item = lenses[lens];
  return (
    <div className="tlx-evidence" aria-label="Contoh interaktif analisis TalentLens">
      <div className="tlx-evidence-nav">
        <div className="tlx-evidence-brand"><span className="tlx-evidence-logo">✳</span> TALENTLENS / INTELLIGENCE VIEW</div>
        <span className="tlx-evidence-tag">SAMPLE DATA · FIKTIF</span>
      </div>
      <div className="tlx-evidence-tabs" role="tablist" aria-label="Pilih perspektif analisis">
        {([
          ["workforce", "Workforce"],
          ["capability", "Capabilities"],
          ["ai", "AI opportunity"],
        ] as const).map(([id,label]) => (
          <button key={id} type="button" role="tab" id={`tlx-tab-${id}`} aria-controls="tlx-evidence-panel" aria-selected={lens === id}
            tabIndex={lens === id ? 0 : -1}
            onClick={() => setLens(id)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const ids: Lens[] = ["workforce","capability","ai"];
              const next = ids[(ids.indexOf(id) + (e.key === "ArrowRight" ? 1 : 2)) % ids.length];
              setLens(next);
              document.getElementById(`tlx-tab-${next}`)?.focus();
            }}>{label}<ArrowUpRight size={14} aria-hidden /></button>
        ))}
      </div>
      <div className="tlx-evidence-content" id="tlx-evidence-panel" role="tabpanel" aria-labelledby={`tlx-tab-${lens}`} key={lens}>
        <div className="tlx-evidence-story">
          <span className="tlx-kicker">{item.eyebrow}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="tlx-evidence-metric"><strong>{item.value}</strong><span>{item.unit}</span></div>
          <small>Angka fiktif untuk contoh visual, bukan hasil analisis pengguna.</small>
        </div>
        <div className="tlx-evidence-plot">
          <div className="tlx-plot-head"><strong>Role-level comparison</strong><span>ILLUSTRATIVE DATASET / 2026</span></div>
          <div className="tlx-plot-legend"><span><i />{item.first}</span><span><i />{item.second}</span></div>
          {item.roles.map(row => (
            <div className="tlx-plot-row" key={row.name}>
              <div className="tlx-plot-label"><strong>{row.name}</strong><small>{row.value}</small></div>
              <div className="tlx-plot-lines" role="img" aria-label={`${row.name}: ${item.first} ${row.before}%, ${item.second} ${row.after}% dari skala ilustratif`}>
                <span style={{width:`${row.before}%`}} /><span style={{width:`${row.after}%`}} />
              </div>
            </div>
          ))}
          <p className="tlx-plot-note">Skala yang sama dipakai dalam tiap perspektif. Pada laporan sebenarnya, UCP dan bottom-up dihitung terpisah dan tidak disamakan otomatis.</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { run, status, start } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const reviewCount = run?.breakdown.filter((r) => r.needs_review).length ?? 0;

  async function runDemo() {
    if (status === "running") return;
    router.push("/proses");
    await start(true);
  }

  return (
    <div className="tlx-site">
      <div className="tlx-container">
        <header className="tlx-header">
          <Link href="/" className="tlx-logo" aria-label="TalentLens beranda"><span className="tlx-logo-symbol">✳</span>talentlens<span className="tlx-brand-dot">.</span></Link>
          <nav className={`tlx-menu ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi utama">
            <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>Cara kerja</a>
            <Link href="/metodologi" onClick={() => setMenuOpen(false)}>Metodologi</Link>
          </nav>
          <Link href="/validasi" className="tlx-header-cta">Buka aplikasi <ArrowUpRight size={17} aria-hidden /></Link>
          <button className="tlx-menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Tutup" : "Menu"}</button>
        </header>
        <main>
          <section className="tlx-hero" aria-labelledby="tlx-headline">
            <div className="tlx-hero-text">
              <div className="tlx-hero-overline"><span className="tlx-star">✦</span> THE NEXT WAY TO PLAN WORKFORCE <span> / 001</span></div>
              <h1 id="tlx-headline">See the work.<br /><em>Shape the<br />workforce<span className="tlx-period">.</span></em></h1>
              <div className="tlx-hero-bottom">
                <p>TalentLens mengubah scope proyek menjadi keputusan talent yang lebih jelas—dengan capability intelligence, estimasi FTE, review yang transparan, dan skenario bantuan AI.</p>
                <div className="tlx-actions">
                  <Link href="/validasi" className="tlx-button-primary">Mulai analisis <ArrowUpRight size={19} aria-hidden /></Link>
                  <button type="button" className="tlx-action-link" onClick={runDemo} disabled={status === "running"}><Play size={15} aria-hidden />{status === "running" ? "Sedang diproses" : "Coba demo"}</button>
                </div>
                {run && <Link className="tlx-continue" href="/hasil/ringkasan">Lanjutkan hasil terakhir{reviewCount ? ` · ${reviewCount} perlu review` : ""} <ArrowRight size={15} aria-hidden /></Link>}
              </div>
            </div>
            <IntelligenceOrbit />
            <a className="tlx-scroll-cue" href="#platform">SCROLL TO DISCOVER <ArrowDownRight size={17} aria-hidden /></a>
          </section>
        </main>
      </div>

      <div className="tlx-ribbon" aria-label="Tahapan TalentLens">
        <div className="tlx-ribbon-inner"><span>DOCUMENTS</span><b>✳</b><span>CAPABILITIES</span><b>✳</b><span>ESTIMATION</span><b>✳</b><span>REVIEW</span><b>✳</b><span>AI SCENARIO</span><b>✳</b><span>COST</span></div>
      </div>

      <div className="tlx-container">
        <section id="platform" className="tlx-platform">
          <div className="tlx-section-heading"><span className="tlx-kicker">01 / THE PLATFORM</span>
            <div><h2>Not just an estimate.<br /><em>A clearer decision.</em></h2><p>Keputusan yang penting membutuhkan lebih dari satu angka. TalentLens membuat hubungan antara pekerjaan, perhitungan, dan rekomendasi mudah dilihat.</p></div>
          </div>
          <InteractiveEvidence />
        </section>
        <section className="tlx-approach" id="how-it-works">
          <div className="tlx-section-heading"><span className="tlx-kicker">02 / THE THINKING</span>
            <div><h2>Less guesswork.<br /><em>More clarity.</em></h2></div>
          </div>
          <div className="tlx-approach-list">
            <article className="tlx-approach-row">
              <span className="tlx-approach-number">01</span>
              <h3>Start with<br /><em>the actual work.</em></h3>
              <p>Unggah WBS dan konteks proyek. Intake Agent memetakan pekerjaan, role, dan capability sebelum estimasi dimulai.</p>
              <span className="tlx-approach-symbol tlx-symbol-one" aria-hidden="true">↗</span>
            </article>
            <article className="tlx-approach-row">
              <span className="tlx-approach-number">02</span>
              <h3>Challenge<br /><em>every estimate.</em></h3>
              <p>UCP dan bottom-up memberi dua perspektif. Reviewer menandai perbedaan dan menyediakan alasan untuk diperiksa manusia.</p>
              <span className="tlx-approach-symbol tlx-symbol-two" aria-hidden="true">✳</span>
            </article>
            <article className="tlx-approach-row">
              <span className="tlx-approach-number">03</span>
              <h3>Explore<br /><em>the AI advantage.</em></h3>
              <p>Lihat tugas yang berpotensi dibantu AI. Bandingkan baseline dengan skenario AI sebelum melihat estimasi biaya di akhir.</p>
              <span className="tlx-approach-symbol tlx-symbol-three" aria-hidden="true">◎</span>
            </article>
          </div>
        </section>
      </div>

      <section className="tlx-final-cta">
        <div className="tlx-container tlx-final-inner">
          <div><span className="tlx-kicker">03 / READY TO EXPLORE?</span><h2>Build the team<br /><em>the work deserves.</em></h2></div>
          <div className="tlx-final-side"><p>Dari WBS pertama hingga keputusan biaya terakhir, setiap langkah dirancang agar bisa ditelusuri—dan tetap berada di tangan manusia.</p>
            <Link href="/validasi">Mulai dengan dokumen <ArrowUpRight size={19} aria-hidden /></Link>
            <span>WBS → Review → AI opportunities → Cost</span>
          </div>
        </div>
      </section>
      <footer className="tlx-container tlx-footer"><strong>talentlens<span>.</span></strong><p>Workforce decision intelligence · by Adryan Rizky Alviano</p><div><Link href="/tentang">Tentang</Link><a href="https://github.com/adryanra97/talent-estimation-agent">GitHub</a></div></footer>
    </div>
  );
}
