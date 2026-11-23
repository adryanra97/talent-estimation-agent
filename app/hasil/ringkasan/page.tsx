"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { MethodNote } from "@/components/method-switch";
import { TeamFilter } from "@/components/team-filter";
import { Button, Card, InfoTip, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { ExecutiveHero, Exhibit, MonthlyLine, Waterfall, totals } from "@/components/summary-exhibits";
import type { CostMethod } from "@/lib/cost";
import { fte, month, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";
import type { Comparison } from "@/lib/types";

function sum(rows: Comparison[]) {
  return rows.reduce((a, c) => ({
    ucp: a.ucp + c.ucp_fte,
    bu: a.bu + c.bu_fte,
    req: a.req + (c.requested_fte ?? 0),
    existing: a.existing + c.existing_fte,
    extraUcp: a.extraUcp + c.ucp_additional_fte,
    extraBu: a.extraBu + c.bu_additional_fte,
  }), { ucp: 0, bu: 0, req: 0, existing: 0, extraUcp: 0, extraBu: 0 });
}

function tone(text: string | null): "good" | "warn" | "bad" | "neutral" {
  if (!text) return "neutral";
  if (text === "Selaras") return "good";
  return text === "Lebih tinggi" ? "bad" : "warn";
}

/** Short chip label; the request is the subject, as on the cost page. */
function conclusionLabel(c: Comparison): string {
  const t = c.conclusion.toLowerCase();
  if (t.startsWith("selaras")) return "Selaras";
  if (t.includes("lebih rendah")) return "Di atas kebutuhan";
  if (t.includes("lebih tinggi")) return "Di bawah kebutuhan";
  if (t.startsWith("isi fte")) return "Belum ada permintaan";
  return "Perlu review";
}

/** Size of the gap between request and additional need, averaged over both methods. */
function gapOf(c: Comparison): number {
  if (c.requested_fte === null) return -1;
  return Math.abs(c.requested_fte - (c.ucp_additional_fte + c.bu_additional_fte) / 2);
}

function offNeed(c: Comparison): boolean {
  const label = conclusionLabel(c);
  return label === "Di atas kebutuhan" || label === "Di bawah kebutuhan";
}

function conclusionTone(c: Comparison): "good" | "warn" | "bad" | "neutral" {
  if (c.conclusion.startsWith("Selaras")) return "good";
  if (c.conclusion.toLowerCase().includes("lebih tinggi")) return "bad";
  if (c.conclusion.toLowerCase().includes("lebih rendah")) return "warn";
  return "neutral";
}

export default function SummaryPage() {
  const { catalog, update, run: current, teamView, costSettings, setCostSettings } = useStore();
  const [confirming, setConfirming] = useState(false);

  return (
    <WithRun>
      {(run) => {
        const estimates = Object.fromEntries(run.estimates.map((e) => [e.role, e]));
        const byRole = Object.fromEntries(run.comparisons.map((c) => [c.role, c]));
        const groups = visibleGroups(run, catalog, teamView).map((g) => ({
          ...g, rows: g.roles.map((role) => byRole[role]).filter((c): c is Comparison => Boolean(c)),
        }));
        const grouped = groups.length > 1;
        const shown = groups.flatMap((group) => group.rows);
        const displayedRoles = new Set(shown.map((c) => c.role));
        const total = sum(shown);
        const review = run.breakdown.filter((r) => displayedRoles.has(r.role) && r.needs_review).length;
        const hasRequested = shown.some((r) => r.requested_fte !== null);
        const maxFte = Math.max(.1, ...shown.flatMap((c) => [c.ucp_fte, c.bu_fte]));
        const maxDifference = [...shown].sort((a, b) => Math.abs(b.ucp_fte - b.bu_fte) - Math.abs(a.ucp_fte - a.bu_fte))[0];
        const delta = Math.abs(total.ucp - total.bu);
        const method = costSettings.method;
        const methodName = method === "ucp" ? "UCP" : "bottom-up";
        const setMethod = (m: CostMethod) => setCostSettings({ ...costSettings, method: m });
        const headline = totals(shown, method);
        const bridgeGap = headline.requested - headline.additional;
        const offRoles = shown.filter(offNeed);
        const over = offRoles.filter((c) => conclusionLabel(c) === "Di atas kebutuhan").length;
        const under = offRoles.filter((c) => conclusionLabel(c) === "Di bawah kebutuhan").length;
        const roleTitle = !hasRequested
          ? "Kebutuhan per role dari dua metode"
          : offRoles.length === 0
            ? "Semua role selaras dengan permintaan"
            : over >= under
              ? `${over} dari ${shown.length} role diminta di atas kebutuhan`
              : `${under} dari ${shown.length} role diminta di bawah kebutuhan`;
        const roleNote = [over ? `${over} di atas kebutuhan` : "", under ? `${under} di bawah kebutuhan` : "", shown.length - offRoles.length ? `${shown.length - offRoles.length} selaras atau perlu review` : ""].filter(Boolean).join(", ");
        const monthlyTotals = run.monthly.map((m) => ({ month: m.month, value: [...displayedRoles].reduce((a, r) => a + ((method === "ucp" ? m.ucp : m.bottom_up)[r] ?? 0), 0) }));
        const peak = monthlyTotals.reduce<{ month: string; value: number } | null>((b, p) => (!b || p.value > b.value ? p : b), null);

        return (
          <>
            <PageHeader
              title="Ringkasan keputusan"
              description="Semua angka FTE di halaman ini adalah rata-rata selama periode analisis."
              actions={
                <>
                  <TeamFilter run={run} />
                  {run.approved ? (
                    <span className="inline-flex items-center gap-2">
                      <StatusBadge tone="good"><CheckCircle2 size={14} aria-hidden /> Disetujui</StatusBadge>
                      <Button variant="ghost" size="sm" onClick={() => current && void update({ ...current, approved: false })}>Batalkan</Button>
                    </span>
                  ) : (
                    <Button variant="secondary" aria-expanded={review > 0 ? confirming : undefined} onClick={() => {
                      if (!current) return;
                      if (review > 0) { setConfirming(true); return; }
                      void update({ ...current, approved: true });
                    }}>
                      Setujui hasil
                    </Button>
                  )}
                </>
              }
            />

            {confirming && !run.approved && (
              <div className="tl-approve-confirm" role="alertdialog" aria-labelledby="tl-approve-title" aria-describedby="tl-approve-desc">
                <div>
                  <p id="tl-approve-title"><strong>{review} baris masih perlu review.</strong></p>
                  <p id="tl-approve-desc">Angka di halaman ini bisa berubah setelah baris tersebut ditinjau. Persetujuan tetap bisa dibatalkan nanti.</p>
                </div>
                <div className="tl-approve-actions">
                  <Link href="/hasil/review" className="tl-approve-link">Tinjau dulu</Link>
                  <Button variant="secondary" onClick={() => { if (current) void update({ ...current, approved: true }); setConfirming(false); }}>Tetap setujui</Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>Batal</Button>
                </div>
              </div>
            )}

            <ExecutiveHero t={headline} method={method} onMethod={setMethod} review={review} roles={shown.length} />
            <MethodNote />

            <nav className="tl-exec-next" aria-label="Tindakan berikutnya">
              <span>Langkah berikutnya</span>
              <Link href={review ? "/hasil/breakdown?review=1" : "/hasil/breakdown"}>
                {review ? "Tinjau baris yang ditandai" : "Periksa rincian pekerjaan"} <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/hasil/biaya">Lihat dampak biaya <ArrowRight size={15} aria-hidden /></Link>
              <Link href="/hasil/temuan">Temuan dan asumsi <ArrowRight size={15} aria-hidden /></Link>
            </nav>

            <Exhibit n={1} id="tl-exhibit-bridge"
              title={!headline.hasRequested
                ? `Pekerjaan di WBS membutuhkan ${fte(headline.additional)} FTE tambahan`
                : bridgeGap > 0.05
                  ? `Permintaan ${fte(bridgeGap)} FTE lebih besar dari kebutuhan tambahan`
                  : bridgeGap < -0.05
                    ? `Permintaan ${fte(-bridgeGap)} FTE lebih kecil dari kebutuhan tambahan`
                    : "Permintaan sejalan dengan kebutuhan tambahan"}
              source={`Sumber: WBS proyek dan dokumen permintaan. Kebutuhan dihitung dengan metode ${methodName}, dirata-rata selama periode analisis; talent tersedia dari input proyek. Role tanpa angka permintaan tidak masuk jembatan ini.`}>
              <Waterfall t={headline} method={method} />
            </Exhibit>

            <Exhibit n={2} id="tl-exhibit-monthly"
              title={peak ? `Kebutuhan memuncak di ${month(peak.month)} sebesar ${fte(peak.value)} FTE` : "Kebutuhan per bulan"}
              source={`Sumber: jadwal item WBS dan alokasi FTE per item, metode ${methodName}. Garis putus-putus adalah permintaan ditambah talent tersedia.`}>
              <MonthlyLine monthly={run.monthly} roles={[...displayedRoles]} method={method}
                reference={headline.hasRequested ? headline.requested + headline.existing : null} referenceLabel="Diminta + tersedia" />
            </Exhibit>

            <section aria-labelledby="tl-role-comparison">
              <div className="tl-summary-section-head">
                <div>
                  <p className="tl-summary-eyebrow">GAMBAR 3</p>
                  <h2 id="tl-role-comparison">{roleTitle}</h2>
                </div>
              </div>
              <p className="tl-report-footnote tl-summary-chart-guide">
                {hasRequested && roleNote ? `${roleNote}. ` : ""}Role diurutkan dari selisih terbesar terhadap permintaan. Warna penuh menandai role yang permintaannya tidak sesuai kebutuhan; abu-abu berarti selaras atau belum ada permintaan.
              </p>
              {shown.length === 0 ? (
                <p className="tl-results-empty-filter">Tidak ada role untuk tim ini. Pilih tim lainnya.</p>
              ) : groups.map((group) => {
                const subtotal = sum(group.rows);
                return (
                  <section key={group.key} className="tl-summary-group" aria-label={`Tim ${group.label}`}>
                    <div className="tl-summary-group-head">
                      <h3>{grouped || teamView !== "all" ? `Tim ${group.label}` : "Semua role"}</h3>
                      <p>{group.rows.length} role <span aria-hidden="true">·</span> UCP {fte(subtotal.ucp)} <span aria-hidden="true">/</span> Bottom-up {fte(subtotal.bu)} FTE</p>
                    </div>
                    {[...group.rows].sort((a, b) => gapOf(b) - gapOf(a)).map((c) => (
                      <div key={c.role} className={`tl-summary-role ${offNeed(c) ? "is-off" : "is-muted"}`}>
                        <div className="tl-summary-role-title">
                          <strong>{roleName(c.role, catalog?.roles)}</strong>
                          <small>{c.role} · Diminta {fte(c.requested_fte)} FTE</small>
                        </div>
                        <div className="tl-summary-role-bars" role="img" aria-label={`${roleName(c.role, catalog?.roles)}: UCP ${fte(c.ucp_fte)} FTE, bottom-up ${fte(c.bu_fte)} FTE`}>
                          <div className="tl-summary-barline"><span>UCP</span><div className="tl-summary-bartrack"><div className="tl-summary-barfill" style={{ width: `${Math.max(0, c.ucp_fte) / maxFte * 100}%` }} /></div><strong>{fte(c.ucp_fte)}</strong></div>
                          <div className="tl-summary-barline"><span>BU</span><div className="tl-summary-bartrack"><div className="tl-summary-barfill is-bu" style={{ width: `${Math.max(0, c.bu_fte) / maxFte * 100}%` }} /></div><strong>{fte(c.bu_fte)}</strong></div>
                        </div>
                        <div className="tl-summary-role-status">
                          <span title={c.conclusion}><StatusBadge tone={conclusionTone(c)}>{conclusionLabel(c)}</StatusBadge></span>
                          <span className="sr-only">{c.conclusion}.</span>
                          <small>Tambahan: {fte(Math.min(c.ucp_additional_fte, c.bu_additional_fte))}–{fte(Math.max(c.ucp_additional_fte, c.bu_additional_fte))} FTE</small>
                        </div>
                      </div>
                    ))}
                  </section>
                );
              })}
            </section>

            <p className="tl-summary-method-note">
              <strong>Catatan metode.</strong> Total UCP dan bottom-up berbeda {fte(delta)} FTE pada role yang terlihat
              {maxDifference ? `; selisih terbesar ada di ${roleName(maxDifference.role, catalog?.roles)} (${fte(Math.abs(maxDifference.ucp_fte - maxDifference.bu_fte))} FTE)` : ""}.{" "}
              <Link href="/metodologi">Cara membaca dua metode</Link>
            </p>

            <details className="tl-report-detail">
              <summary>Lihat tabel teknis lengkap dan asumsi perhitungan</summary>
              <Card title="Perbandingan terperinci per role"
                description="Termasuk FTE puncak, pembanding dan perbedaan terhadap jumlah yang diminta. Geser tabel ke kanan pada layar kecil.">
                <div className="overflow-x-auto" role="region" aria-label="Tabel detail estimasi FTE" tabIndex={0}>
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="sticky left-0 text-left">Role</th>
                        <th scope="col" className="text-right">Diminta</th>
                        <th scope="col" className="text-right">Existing</th>
                        <th scope="col" className="text-right">Pembanding</th>
                        <th scope="col" className="text-right">UCP rata-rata</th>
                        <th scope="col" className="text-right">UCP puncak</th>
                        <th scope="col" className="text-right">BU rata-rata</th>
                        <th scope="col" className="text-right">BU puncak</th>
                        <th scope="col" className="text-right">Selisih <InfoTip text="Selisih UCP terhadap bottom-up. Perbedaan besar perlu dipahami melalui rincian pekerjaan." /></th>
                        <th scope="col" className="text-left">UCP vs diminta</th>
                        <th scope="col" className="text-left">BU vs diminta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => {
                        const sub = sum(group.rows);
                        return (
                          <Fragment key={group.key}>
                            {grouped && <tr><th colSpan={11} scope="colgroup" className="text-left font-semibold">Tim {group.label}</th></tr>}
                            {group.rows.map((c) => {
                              const e = estimates[c.role];
                              return (
                                <tr key={c.role}>
                                  <td className="sticky left-0"><RoleBadge role={c.role} name={roleName(c.role, catalog?.roles)} /></td>
                                  <td className="tabular text-right">{fte(c.requested_fte)}</td>
                                  <td className="tabular text-right">{fte(c.existing_fte)}</td>
                                  <td className="tabular text-right">{fte(c.reference_fte)}</td>
                                  <td className="tabular text-right font-medium">{fte(c.ucp_fte)}</td>
                                  <td className="tabular text-right">{fte(e?.ucp_peak_fte)}</td>
                                  <td className="tabular text-right font-medium">{fte(c.bu_fte)}</td>
                                  <td className="tabular text-right">{fte(e?.bu_peak_fte)}</td>
                                  <td className="tabular text-right">{pct(c.divergence, 0, true)}</td>
                                  <td><StatusBadge tone={tone(c.ucp_vs_requested)}>{c.ucp_vs_requested ?? "—"}</StatusBadge></td>
                                  <td><StatusBadge tone={tone(c.bu_vs_requested)}>{c.bu_vs_requested ?? "—"}</StatusBadge></td>
                                </tr>
                              );
                            })}
                            {grouped && (
                              <tr>
                                <td className="font-semibold">Subtotal {group.label}</td>
                                <td className="tabular text-right">{fte(sub.req)}</td>
                                <td className="tabular text-right">{fte(sub.existing)}</td>
                                <td />
                                <td className="tabular text-right">{fte(sub.ucp)}</td>
                                <td /><td className="tabular text-right">{fte(sub.bu)}</td><td colSpan={4} />
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      <tr className="font-semibold">
                        <td>{teamView === "all" ? "Total" : `Total ${groups[0]?.label ?? ""}`}</td>
                        <td className="tabular text-right">{hasRequested ? fte(total.req) : "—"}</td>
                        <td className="tabular text-right">{fte(total.existing)}</td>
                        <td />
                        <td className="tabular text-right">{fte(total.ucp)}</td>
                        <td />
                        <td className="tabular text-right">{fte(total.bu)}</td>
                        <td colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-3">
                  <p className="text-muted">Man-hours UCP: <strong className="tabular text-ink">{num(shown.reduce((a, c) => a + (estimates[c.role]?.ucp_hours ?? 0), 0))} jam</strong></p>
                  <p className="text-muted">Man-hours bottom-up: <strong className="tabular text-ink">{num(shown.reduce((a, c) => a + (estimates[c.role]?.bu_hours ?? 0), 0))} jam</strong></p>
                  <p className="text-muted">PHM: <strong className="tabular text-ink">{fte(run.parameters.phm, 1)} jam per poin</strong>; {run.breakdown.length} baris breakdown</p>
                </div>
              </Card>
            </details>
          </>
        );
      }}
    </WithRun>
  );
}
