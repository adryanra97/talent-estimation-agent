"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { WithRun, roleName } from "@/components/result-guard";
import { Button, Card, InfoTip, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { date, fte, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Comparison } from "@/lib/types";

function tone(text: string | null): "good" | "warn" | "bad" | "neutral" {
  if (!text) return "neutral";
  if (text === "Selaras") return "good";
  if (text === "Lebih tinggi") return "bad";
  return "warn";
}

function conclusionTone(c: Comparison): "good" | "warn" | "bad" | "neutral" {
  if (c.conclusion.startsWith("Selaras")) return "good";
  if (c.conclusion.includes("lebih tinggi")) return "bad";
  if (c.conclusion.includes("lebih rendah")) return "warn";
  return "neutral";
}

export default function SummaryPage() {
  const { catalog, update, run: current } = useStore();
  return (
    <WithRun>
      {(run) => {
        const estimates = Object.fromEntries(run.estimates.map((e) => [e.role, e]));
        const total = run.comparisons.reduce(
          (acc, c) => ({
            ucp: acc.ucp + c.ucp_fte,
            bu: acc.bu + c.bu_fte,
            req: acc.req + (c.requested_fte ?? 0),
            existing: acc.existing + c.existing_fte,
          }),
          { ucp: 0, bu: 0, req: 0, existing: 0 },
        );
        const review = run.breakdown.filter((r) => r.needs_review).length;
        return (
          <>
            <PageHeader
              title="Ringkasan FTE"
              description={`${run.project.name || "Proyek"} · ${date(run.project.start)} s.d. ${date(run.project.end)} · FTE rata-rata periode`}
              actions={
                run.approved ? (
                  <StatusBadge tone="good">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Disetujui
                  </StatusBadge>
                ) : (
                  <Button variant="secondary" onClick={() => current && update({ ...current, approved: true })}>
                    Setujui hasil
                  </Button>
                )
              }
            />

            {review > 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span>
                  {review} baris breakdown ditandai <span className="font-medium">Perlu review</span>. Periksa sebelum hasil dipakai.
                </span>
                <Link href="/hasil/breakdown?review=1" className="font-medium underline">
                  Buka baris yang perlu review
                </Link>
              </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {run.comparisons.map((c) => (
                <div key={c.role} className="rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <RoleBadge role={c.role} />
                    <span className="text-xs text-muted">{roleName(c.role, catalog?.roles)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted">UCP</p>
                      <p className="tabular text-2xl font-semibold text-ink">{fte(c.ucp_fte)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Bottom-up</p>
                      <p className="tabular text-2xl font-semibold text-ink">{fte(c.bu_fte)}</p>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">Diminta</dt>
                      <dd className="tabular text-ink">{fte(c.requested_fte)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Talent existing</dt>
                      <dd className="tabular text-ink">{fte(c.existing_fte)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Kebutuhan tambahan</dt>
                      <dd className="tabular font-medium text-ink">
                        {fte(Math.min(c.ucp_additional_fte, c.bu_additional_fte))}-{fte(Math.max(c.ucp_additional_fte, c.bu_additional_fte))}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <StatusBadge tone={conclusionTone(c)}>{c.conclusion}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>

            <Card
              title="Perbandingan per role"
              description="Kebutuhan tambahan = kebutuhan total dikurangi talent existing; angka inilah yang dibandingkan dengan permintaan."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 text-right font-medium">Diminta</th>
                      <th className="py-2 pr-3 text-right font-medium">Existing</th>
                      <th className="py-2 pr-3 text-right font-medium">Pembanding</th>
                      <th className="py-2 pr-3 text-right font-medium">UCP rata-rata</th>
                      <th className="py-2 pr-3 text-right font-medium">UCP puncak</th>
                      <th className="py-2 pr-3 text-right font-medium">BU rata-rata</th>
                      <th className="py-2 pr-3 text-right font-medium">BU puncak</th>
                      <th className="py-2 pr-3 text-right font-medium">
                        <span className="inline-flex items-center gap-1">
                          Selisih <InfoTip text="Selisih UCP terhadap bottom-up. Selisih besar berarti dua metode tidak sepakat dan perlu dibaca lebih teliti." />
                        </span>
                      </th>
                      <th className="py-2 pr-3 font-medium">UCP vs diminta</th>
                      <th className="py-2 font-medium">BU vs diminta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.comparisons.map((c) => {
                      const e = estimates[c.role];
                      return (
                        <tr key={c.role} className="border-b border-line last:border-0">
                          <td className="py-2.5 pr-3">
                            <RoleBadge role={c.role} name={roleName(c.role, catalog?.roles)} />
                          </td>
                          <td className="tabular py-2.5 pr-3 text-right">{fte(c.requested_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right">{fte(c.existing_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right">{fte(c.reference_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right font-medium">{fte(c.ucp_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right text-muted">{fte(e?.ucp_peak_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right font-medium">{fte(c.bu_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right text-muted">{fte(e?.bu_peak_fte)}</td>
                          <td className="tabular py-2.5 pr-3 text-right">{pct(c.divergence, 0, true)}</td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge tone={tone(c.ucp_vs_requested)}>{c.ucp_vs_requested ?? "-"}</StatusBadge>
                          </td>
                          <td className="py-2.5">
                            <StatusBadge tone={tone(c.bu_vs_requested)}>{c.bu_vs_requested ?? "-"}</StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-canvas font-medium">
                      <td className="py-2.5 pr-3">Total</td>
                      <td className="tabular py-2.5 pr-3 text-right">{fte(total.req)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{fte(total.existing)}</td>
                      <td className="py-2.5 pr-3" />
                      <td className="tabular py-2.5 pr-3 text-right">{fte(total.ucp)}</td>
                      <td className="py-2.5 pr-3" />
                      <td className="tabular py-2.5 pr-3 text-right">{fte(total.bu)}</td>
                      <td colSpan={4} />
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-3">
                <p className="text-muted">
                  Man-hours UCP <span className="tabular font-medium text-ink">{num(run.estimates.reduce((a, e) => a + e.ucp_hours, 0))}</span> jam
                </p>
                <p className="text-muted">
                  Man-hours bottom-up <span className="tabular font-medium text-ink">{num(run.estimates.reduce((a, e) => a + e.bu_hours, 0))}</span> jam
                </p>
                <p className="text-muted">
                  PHM <span className="tabular font-medium text-ink">{fte(run.parameters.phm, 1)}</span> jam/UCP · {run.breakdown.length} baris
                </p>
              </div>
            </Card>
          </>
        );
      }}
    </WithRun>
  );
}
