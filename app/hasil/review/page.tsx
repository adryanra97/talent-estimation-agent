"use client";

import { ArrowRight, ChevronDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { WithRun, roleName } from "@/components/result-guard";
import { PageHeader } from "@/components/ui";
import { TeamFilter } from "@/components/team-filter";
import { useStore } from "@/lib/store";
import { visibleRoles } from "@/lib/teams";

export default function ReviewPage() {
  const { catalog, teamView } = useStore();
  return (
    <WithRun>
      {(run) => {
        const roles = new Set(visibleRoles(run, catalog, teamView));
        const scoped = run.breakdown.filter((item) => roles.has(item.role));
        const pending = scoped.filter((item) => item.needs_review);
        const roleCount = new Set(pending.map((item) => item.role)).size;
        return (
          <>
            <PageHeader title="Perlu review"
              description="Pusat perhatian untuk pekerjaan yang ditandai reviewer. Buka alasannya, lalu lanjutkan ke breakdown WBS untuk mengedit atau meminta penilaian ulang."
              actions={<TeamFilter run={run} />} />
            <dl className="tl-review-summary" aria-label="Status review">
              <div><dt>Item perlu review</dt><dd>{pending.length}</dd></div>
              <div><dt>Role terkait</dt><dd>{roleCount}</dd></div>
              <div><dt>Item diperiksa</dt><dd>{scoped.length}</dd></div>
            </dl>
            {pending.length === 0 ? (
              <section className="py-10">
                <CheckCircle2 size={29} className="text-emerald-700" aria-hidden />
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Tidak ada item yang ditandai untuk review.</h2>
                <p className="mt-3 text-sm text-muted">Kamu tetap bisa meninjau semua klasifikasi, capability, dan alokasi effort dalam rincian WBS.</p>
                <Link href="/hasil/breakdown" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-700">Lihat seluruh rincian <ArrowRight size={16} aria-hidden /></Link>
              </section>
            ) : (
              <>
                <div className="tl-review-intro">
                  <div>
                    <p className="tl-summary-eyebrow">REVIEW CENTER / EVIDENCE FIRST</p>
                    <h2>Mulai dari item yang membutuhkan perhatian.</h2>
                    <p>Status berasal dari hasil analisis, bukan prioritas yang dibuat-buat.</p>
                  </div>
                  <Link href="/hasil/breakdown?review=1" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-accent-700">Buka tabel review <ArrowRight size={16} aria-hidden /></Link>
                </div>
                <div>
                  {pending.map((item) => {
                    const compare = run.comparisons.find((entry) => entry.role === item.role);
                    return (
                      <details key={`${item.item_id}|${item.role}`} className="tl-review-row">
                        <summary>
                          <span>{item.item_id}</span>
                          <span><strong>{item.item_name}</strong><small>{roleName(item.role, catalog?.roles)} · {item.involvement} · {item.classification}</small></span>
                          <span>Perlu review</span>
                          <ChevronDown size={17} aria-hidden />
                        </summary>
                        <div className="tl-review-row-body">
                          <p><strong>Alasan klasifikasi:</strong> {item.classification_reason || "Tidak ada alasan yang tercatat."}</p>
                          <p><strong>Alasan alokasi:</strong> {item.allocation_reason || "Tidak ada alasan yang tercatat."}</p>
                          <p><strong>Capability:</strong> {item.capabilities.map((entry) => entry.skill).join(", ") || "Belum dipetakan"}</p>
                          {compare && <p><strong>Konteks estimasi role:</strong> UCP {compare.ucp_fte.toLocaleString("id-ID", { maximumFractionDigits: 2 })} FTE dan bottom-up {compare.bu_fte.toLocaleString("id-ID", { maximumFractionDigits: 2 })} FTE untuk role ini secara keseluruhan, bukan hanya item yang dibuka.</p>}
                          <Link href="/hasil/breakdown?review=1">Buka breakdown untuk mengedit atau menilai ulang <ArrowRight size={14} aria-hidden /></Link>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </>
        );
      }}
    </WithRun>
  );
}
