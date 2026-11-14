"use client";

import { ArrowDownToLine, ArrowRight, CheckCircle2, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESULT_LINKS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { date } from "@/lib/format";

/** Shared, document-like presentation around every results route. All values come from the current run. */
export function ResultsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { run, busy, exportExcel } = useStore();
  const pending = run?.breakdown.filter((row) => row.needs_review).length ?? 0;
  const activeIndex = RESULT_LINKS.findIndex((item) => item.href === pathname);

  return (
    <div className="tl-results-page">
      <header className="tl-report-cover">
        <div className="tl-report-cover-top">
          <span className="tl-report-overline"><span className="tl-report-overline-dot" /> TALENTLENS / ANALYSIS REPORT</span>
          <span className="tl-report-edition">EVIDENCE-LED WORKFORCE PLANNING</span>
        </div>
        <div className="tl-report-cover-main">
          <div className="tl-report-cover-copy">
            <p className="tl-report-issue">PROJECT INTELLIGENCE <span aria-hidden="true">/</span> {run ? "HASIL ANALISIS" : "MENUNGGU ANALISIS"}</p>
            <h2>Keputusan talent, <em>berbasis bukti.</em></h2>
            <p className="tl-report-project">{run?.project.name || "Laporan estimasi kebutuhan talent"}</p>
            {run && <p className="tl-report-dates">Periode {date(run.project.start)} – {date(run.project.end)} <span aria-hidden="true">·</span> {run.comparisons.length} role dianalisis</p>}
          </div>
          <div className="tl-report-cover-actions">
            {run ? (
              <>
                <span className={"tl-report-verdict " + (run.approved ? "is-approved" : pending ? "is-attention" : "is-pending")}>
                  {run.approved ? <CheckCircle2 size={15} aria-hidden /> : pending ? <ShieldAlert size={15} aria-hidden /> : <FileText size={15} aria-hidden />}
                  {run.approved ? "Hasil disetujui" : pending ? `${pending} baris perlu review` : "Siap ditinjau"}
                </span>
                <button type="button" disabled={busy} className="tl-report-export" onClick={() => void exportExcel()}>
                  <ArrowDownToLine size={16} aria-hidden />
                  {busy ? "Menyiapkan…" : "Unduh laporan Excel"}
                </button>
              </>
            ) : (
              <Link href="/validasi" className="tl-report-export">Mulai validasi <ArrowRight size={16} aria-hidden /></Link>
            )}
          </div>
        </div>
      </header>

      <nav className="tl-report-nav" aria-label="Bagian laporan hasil">
        <div className="tl-report-nav-list">
          {RESULT_LINKS.map((item, i) => (
            <Link key={item.href} href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={"tl-report-nav-link" + (pathname === item.href ? " is-active" : "")}>
              <span className="tl-report-nav-number">{String(i + 1).padStart(2, "0")}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <span className="tl-report-nav-position" aria-hidden="true">{activeIndex < 0 ? "—" : String(activeIndex + 1).padStart(2, "0")} / {String(RESULT_LINKS.length).padStart(2, "0")}</span>
      </nav>

      <main className="tl-report-content" id="report-content">
        {children}
      </main>
      <footer className="tl-report-footer">
        <p>TalentLens <span aria-hidden="true">/</span> Perhitungan oleh kode, penilaian berbasis konteks, keputusan akhir oleh manusia.</p>
        <Link href="/metodologi">Baca metodologi <ArrowRight size={14} aria-hidden /></Link>
      </footer>
    </div>
  );
}
