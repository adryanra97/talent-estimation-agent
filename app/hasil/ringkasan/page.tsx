"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Button, Card, InfoTip, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { date, fte, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";
import type { Comparison } from "@/lib/types";

function sum(rows: Comparison[]) {
  return rows.reduce(
    (acc, c) => ({
      ucp: acc.ucp + c.ucp_fte,
      bu: acc.bu + c.bu_fte,
      req: acc.req + (c.requested_fte ?? 0),
      existing: acc.existing + c.existing_fte,
    }),
    { ucp: 0, bu: 0, req: 0, existing: 0 },
  );
}

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
  const { catalog, update, run: current, teamView } = useStore();
  return (
    <WithRun>
      {(run) => {
        const estimates = Object.fromEntries(run.estimates.map((e) => [e.role, e]));
        const byRole = Object.fromEntries(run.comparisons.map((c) => [c.role, c]));
        const groups = visibleGroups(run, catalog, teamView).map((g) => ({
          ...g,
          rows: g.roles.map((r) => byRole[r]).filter(Boolean),
        }));
        const grouped = groups.length > 1;
        const shown = groups.flatMap((g) => g.rows);
        const total = sum(shown);
        const review = run.breakdown.filter((r) => r.needs_review).length;
        return (
          <>
            <PageHeader
              title="Ringkasan FTE"
              description={`${run.project.name || "Proyek"} · ${date(run.project.start)} s.d. ${date(run.project.end)} · FTE rata-rata periode`}
              actions={
                <>
                <TeamFilter run={run} />
                {run.approved ? (
                  <StatusBadge tone="good">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Disetujui
                  </StatusBadge>
                ) : (
                  <Button variant="secondary" onClick={() => current && update({ ...current, approved: true })}>
                    Setujui hasil
                  </Button>
                )}
                </>
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

            {groups.map((g) => {
              const t = sum(g.rows);
              return (
            <section key={g.key} aria-label={`Tim ${g.label}`} className="mb-6">
              {grouped || teamView !== "all" ? (
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">
                    Tim {g.label} <span className="text-sm font-normal text-muted">· {g.rows.length} role</span>
                  </h2>
                  <p className="tabular text-sm text-muted">
                    Bottom-up <span className="font-medium text-ink">{fte(t.bu)}</span> · UCP <span className="font-medium text-ink">{fte(t.ucp)}</span> · diminta{" "}
                    <span className="font-medium text-ink">{fte(t.req)}</span> FTE
                  </p>
                </div>
              ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {g.rows.map((c) => (
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
            </section>
              );
            })}

            <Card
              title="Perbandingan per role"
              description="Kebutuhan tambahan = kebutuhan total dikurangi talent existing; angka inilah yang dibandingkan dengan permintaan."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">Role</th>
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
                    {groups.map((g) => {
                      const t = sum(g.rows);
                      return (
                    <Fragment key={g.key}>
                    {grouped && (
                      <tr className="border-b border-line">
                        <th colSpan={11} scope="colgroup" className="pt-4 pb-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                          Tim {g.label}
                        </th>
                      </tr>
                    )}
                    {g.rows.map((c) => {
                      const e = estimates[c.role];
                      return (
                        <tr key={c.role} className="border-b border-line">
                          <td className="sticky left-0 bg-surface py-2.5 pr-3">
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
                    {grouped && (
                      <tr className="border-b border-line text-muted">
                        <td className="py-2 pr-3 text-xs">Subtotal {g.label}</td>
                        <td className="tabular py-2 pr-3 text-right">{fte(t.req)}</td>
                        <td className="tabular py-2 pr-3 text-right">{fte(t.existing)}</td>
                        <td className="py-2 pr-3" />
                        <td className="tabular py-2 pr-3 text-right">{fte(t.ucp)}</td>
                        <td className="py-2 pr-3" />
                        <td className="tabular py-2 pr-3 text-right">{fte(t.bu)}</td>
                        <td colSpan={4} />
                      </tr>
                    )}
                    </Fragment>
                      );
                    })}
                    <tr className="bg-canvas font-medium">
                      <td className="py-2.5 pr-3">{teamView === "all" ? "Total" : `Total ${groups[0]?.label ?? ""}`}</td>
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
                  Man-hours UCP <span className="tabular font-medium text-ink">{num(shown.reduce((a, c) => a + (estimates[c.role]?.ucp_hours ?? 0), 0))}</span> jam
                </p>
                <p className="text-muted">
                  Man-hours bottom-up <span className="tabular font-medium text-ink">{num(shown.reduce((a, c) => a + (estimates[c.role]?.bu_hours ?? 0), 0))}</span> jam
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
