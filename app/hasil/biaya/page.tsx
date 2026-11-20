"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/drawer";
import { jt } from "@/components/rates-editor";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Card, PageHeader, RoleBadge, StatusBadge, inputBase } from "@/components/ui";
import { type CostBasis, type CostMethod, type RoleCost, roleCosts, rupiah } from "@/lib/cost";
import { fte } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";
import type { Comparison, RateLevel } from "@/lib/types";

const LEVELS: RateLevel[] = ["J", "M", "S", "L"];

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas p-1" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 text-sm ${value === v ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

function gapTone(gap: number | null): "good" | "warn" | "bad" | "neutral" {
  if (gap === null) return "neutral";
  if (Math.abs(gap) < 1) return "good";
  return gap > 0 ? "bad" : "warn";
}

function gapLabel(gap: number | null): string {
  if (gap === null) return "Belum ada permintaan";
  if (Math.abs(gap) < 1) return "Sama";
  return gap > 0 ? "Di atas kebutuhan" : "Di bawah kebutuhan";
}

export default function CostPage() {
  const { catalog, teamView, rates, costSettings, setCostSettings } = useStore();
  const [detail, setDetail] = useState<RoleCost | null>(null);

  return (
    <WithRun>
      {(run) => {
        if (!rates) return <p className="text-sm text-muted">Memuat rate talenta…</p>;
        const byRole = Object.fromEntries(run.comparisons.map((c) => [c.role, c]));
        const rows = visibleGroups(run, catalog, teamView)
          .flatMap((g) => g.roles.map((r) => byRole[r]))
          .filter((c): c is Comparison => Boolean(c));
        const costs = roleCosts(run, rows, rates, costSettings);
        const months = Math.max(1, run.monthly.length);
        const hasRequested = costs.some((c) => c.requestedMonthly !== null);
        const priced = costs.filter((c) => c.requestedMonthly !== null);
        const totalComputed = costs.reduce((a, c) => a + c.computedMonthly, 0);
        const totalRequested = priced.reduce((a, c) => a + (c.requestedMonthly ?? 0), 0);
        const totalGap = priced.reduce((a, c) => a + (c.gapMonthly ?? 0), 0);
        const aiComplete = run.ai_enabled && costs.length > 0 && costs.every((c) => c.assistedMonthly !== null);
        const totalAssisted = aiComplete ? costs.reduce((a, c) => a + (c.assistedMonthly ?? 0), 0) : null;
        const totalPotential = totalAssisted === null ? null : Math.max(0, totalComputed - totalAssisted);
        const maxCost = Math.max(1, ...costs.map((c) => c.computedMonthly));
        const methodName = costSettings.method === "ucp" ? "UCP" : "bottom-up";
        const basisName = costSettings.basis === "vendor" ? "tarif vendor" : "biaya karyawan";
        const setLevel = (role: string, level: RateLevel) =>
          setCostSettings({ ...costSettings, levels: { ...costSettings.levels, [role]: level } });

        const headline = aiComplete
          ? `Dengan bantuan AI, potensi efisiensi effort setara ${rupiah(totalPotential)} per bulan—berdasarkan rate dan metode yang dipilih.`
          : `Baseline kebutuhan talent setara ${rupiah(totalComputed)} per bulan. Skenario AI ditampilkan setelah analisis bantuan AI tersedia.`;

        return (
          <>
            <PageHeader
              title="Keputusan biaya"
              description={`Tahap akhir analisis: bandingkan biaya baseline dan kapasitas setara biaya setelah bantuan AI. Menggunakan metode ${methodName} dan ${basisName} untuk ${months} bulan.`}
              actions={
                <>
                  <TeamFilter run={run} />
                  <Segmented<CostBasis> label="Dasar biaya" value={costSettings.basis}
                    options={[["employee", "Karyawan"], ["vendor", "Vendor"]]}
                    onChange={(basis) => setCostSettings({ ...costSettings, basis })} />
                  <Segmented<CostMethod> label="Metode FTE" value={costSettings.method}
                    options={[["bu", "Bottom-up"], ["ucp", "UCP"]]}
                    onChange={(method) => setCostSettings({ ...costSettings, method })} />
                </>
              }
            />

            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              <strong>Estimasi menggunakan benchmark gaji publik, bukan tarif internal.</strong> Nilai efisiensi AI adalah potensi pengurangan effort yang dikonversi ke biaya setara kapasitas, bukan penghematan anggaran yang sudah terealisasi. Rate dan pengali dapat diubah di{" "}
              <Link href="/pengaturan#rate" className="font-medium underline">Pengaturan</Link>.
            </p>

            <section className="tl-summary-intro" aria-labelledby="tl-cost-conclusion">
              <div>
                <p className="tl-summary-eyebrow">FINAL DECISION / COST INTELLIGENCE</p>
                <h2 id="tl-cost-conclusion">{headline}</h2>
                <p>Angka per bulan memakai FTE rata-rata {methodName} selama periode analisis.</p>
              </div>
            </section>

            <dl className="tl-summary-metrics tl-cost-metrics" aria-label="Perbandingan baseline dan skenario AI">
              <div className="tl-summary-metric">
                <dt>Biaya baseline</dt>
                <dd>{rupiah(totalComputed)}</dd>
                <small>per bulan · {methodName}</small>
              </div>
              <div className="tl-summary-metric">
                <dt>Skenario dengan AI</dt>
                <dd>{rupiah(totalAssisted)}</dd>
                <small>{aiComplete ? "per bulan · effort dibantu AI" : "Belum tersedia"}</small>
              </div>
              <div className="tl-summary-metric">
                <dt>Potensi efisiensi</dt>
                <dd className="tl-cost-saving">{rupiah(totalPotential)}</dd>
                <small>nilai setara kapasitas / bulan</small>
              </div>
              <div className="tl-summary-metric">
                <dt>Selama proyek</dt>
                <dd>{rupiah(totalPotential === null ? null : totalPotential * months)}</dd>
                <small>proyeksi {months} bulan</small>
              </div>
            </dl>

            <div className="tl-cost-context">
              <div>
                <span className="tl-summary-eyebrow">PERMINTAAN VS. BASELINE</span>
                <p>Biaya FTE yang diminta: <strong>{hasRequested ? rupiah(totalRequested) : "belum tersedia"}</strong> per bulan.
                  {hasRequested ? <> Selisih terhadap hasil hitung: <strong>{rupiah(totalGap, true)}</strong> per bulan ({rupiah(totalGap * months, true)} selama periode).</> : null}
                </p>
                {hasRequested && priced.length < costs.length && <small>Perbandingan permintaan mencakup {priced.length} dari {costs.length} role; total baseline di atas mencakup seluruh role.</small>}
              </div>
              {!aiComplete && (
                <div>
                  <p>{!run.ai_enabled ? "Analisis bantuan AI belum diaktifkan untuk hasil ini." : "Skenario AI belum lengkap untuk semua role pada filter ini."}</p>
                  <Link href={run.ai_enabled ? "/hasil/peluang-ai" : "/validasi"}> {run.ai_enabled ? "Periksa analisis AI" : "Aktifkan analisis AI"} →</Link>
                </div>
              )}
            </div>

            <section className="tl-cost-breakdown" aria-labelledby="tl-cost-breakdown-title">
              <div className="tl-summary-section-head">
                <div>
                  <p className="tl-summary-eyebrow">COST SCENARIO / BY ROLE</p>
                  <h2 id="tl-cost-breakdown-title">Dari baseline ke skenario bantuan AI.</h2>
                </div>
                <p>Setiap perbandingan memakai rate level yang sama. Perubahan mencerminkan effort yang berpotensi dibantu AI.</p>
              </div>
              {costs.length ? costs.map((c) => (
                <div className="tl-cost-role" key={c.role}>
                  <div className="tl-cost-role-label"><strong>{roleName(c.role, catalog?.roles)}</strong><small>{c.level} · {fte(c.computedFte)} FTE baseline{c.assistedFte === null ? "" : ` → ${fte(c.assistedFte)} FTE dibantu AI`}</small></div>
                  <div className="tl-cost-role-bars" role="img" aria-label={`${roleName(c.role, catalog?.roles)}, baseline ${rupiah(c.computedMonthly)} per bulan, skenario AI ${rupiah(c.assistedMonthly)} per bulan`}>
                    <div className="tl-cost-barline"><span>Baseline</span><div className="tl-cost-track"><i style={{ width: `${c.computedMonthly / maxCost * 100}%` }} /></div><b>{rupiah(c.computedMonthly)}</b></div>
                    <div className="tl-cost-barline"><span>Dengan AI</span><div className="tl-cost-track"><i className="is-ai" style={{ width: `${(c.assistedMonthly ?? 0) / maxCost * 100}%` }} /></div><b>{rupiah(c.assistedMonthly)}</b></div>
                  </div>
                  <div className="tl-cost-role-saving"><strong>{rupiah(c.potentialMonthly)}</strong><small>potensi / bulan</small></div>
                </div>
              )) : <p className="text-sm text-muted">Tidak ada role pada filter ini.</p>}
              <p className="tl-report-footnote">Biaya adalah proyeksi berbasis rata-rata FTE. Realisasi penghematan membutuhkan keputusan staffing, utilisasi, dan biaya implementasi AI yang tidak termasuk dalam estimasi ini.</p>
            </section>

            <Card title="Rincian rate dan biaya per role" description="Pilih level talenta untuk memperbarui baseline dan skenario AI. Klik angka rate untuk memeriksa rumus dan sumbernya.">
              {costs.length === 0 ? (
                <p className="text-sm text-muted">Tidak ada role untuk tim ini. Pilih tim lainnya.</p>
              ) : (
                <>
                  <ul className="divide-y divide-line md:hidden">
                    {costs.map((c) => (
                      <li key={c.role} className="grid gap-2 py-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <RoleBadge role={c.role} name={roleName(c.role, catalog?.roles)} />
                          <StatusBadge tone={gapTone(c.gapMonthly)}>{gapLabel(c.gapMonthly)}</StatusBadge>
                        </div>
                        <label className="flex items-center justify-between gap-3 text-muted">
                          Level
                          <select className={`${inputBase} py-1`} value={c.level} onChange={(e) => setLevel(c.role, e.target.value as RateLevel)}>
                            {LEVELS.map((l) => <option key={l} value={l}>{rates.levels[l]}</option>)}
                          </select>
                        </label>
                        <dl className="grid grid-cols-2 gap-2">
                          <div><dt className="text-xs text-muted">Diminta ({fte(c.requestedFte)} FTE)</dt><dd className="tabular">{rupiah(c.requestedMonthly)}</dd></div>
                          <div><dt className="text-xs text-muted">Hasil hitung ({fte(c.computedFte)} FTE)</dt><dd className="tabular font-medium">{rupiah(c.computedMonthly)}</dd></div>
                          <div><dt className="text-xs text-muted">Dengan AI</dt><dd className="tabular">{rupiah(c.assistedMonthly)}</dd></div>
                          <div><dt className="text-xs text-muted">Potensi efisiensi</dt><dd className="tabular">{rupiah(c.potentialMonthly)}</dd></div>
                          <div className="col-span-2"><dt className="text-xs text-muted">Selisih permintaan vs baseline</dt><dd className="tabular">{rupiah(c.gapMonthly, true)}</dd></div>
                        </dl>
                        <button type="button" onClick={() => setDetail(c)} className="justify-self-start text-accent-700 hover:underline">Lihat rumus</button>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Biaya per role per bulan</caption>
                      <thead>
                        <tr className="border-b border-line text-left text-xs text-muted">
                          <th scope="col" className="py-2 pr-3 font-medium">Role</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Level</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Biaya per FTE</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Diminta</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Baseline</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Dengan AI</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Potensi efisiensi</th>
                          <th scope="col" className="py-2 pr-3 text-right font-medium">Selisih permintaan</th>
                          <th scope="col" className="py-2 font-medium"><span className="sr-only">Keterangan</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.map((c) => {
                          const name = roleName(c.role, catalog?.roles);
                          return (
                            <tr key={c.role} className="border-b border-line last:border-0">
                              <th scope="row" className="py-3 pr-3 text-left font-normal"><RoleBadge role={c.role} name={name} /></th>
                              <td className="py-2 pr-3">
                                <select aria-label={`Level ${name}`} className={`${inputBase} py-1`} value={c.level}
                                  onChange={(e) => setLevel(c.role, e.target.value as RateLevel)}>
                                  {LEVELS.map((l) => <option key={l} value={l}>{rates.levels[l]}</option>)}
                                </select>
                              </td>
                              <td className="tabular py-3 pr-3 text-right">
                                <button type="button" onClick={() => setDetail(c)} className="inline-flex items-center gap-1 text-accent-700 hover:underline"
                                  aria-label={`Rumus biaya ${name}`}>
                                  {rupiah(c.perFte)} <Info className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </td>
                              <td className="tabular py-3 pr-3 text-right">
                                {rupiah(c.requestedMonthly)}<span className="block text-xs text-muted">{fte(c.requestedFte)} FTE</span>
                              </td>
                              <td className="tabular py-3 pr-3 text-right font-medium">
                                {rupiah(c.computedMonthly)}<span className="block text-xs font-normal text-muted">{fte(c.computedFte)} FTE</span>
                              </td>
                              <td className="tabular py-3 pr-3 text-right">{rupiah(c.assistedMonthly)}<span className="block text-xs text-muted">{c.assistedFte === null ? "Skenario tidak tersedia" : `${fte(c.assistedFte)} FTE`}</span></td>
                              <td className="tabular py-3 pr-3 text-right font-medium text-accent-700">{rupiah(c.potentialMonthly)}</td>
                              <td className="tabular py-3 pr-3 text-right">{rupiah(c.gapMonthly, true)}</td>
                              <td className="py-3"><StatusBadge tone={gapTone(c.gapMonthly)}>{gapLabel(c.gapMonthly)}</StatusBadge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                Level dan pengali biaya ikut terbawa ke sheet Biaya saat Excel diunduh. Skenario AI di halaman ini merupakan analisis tambahan; nilai baseline tetap tidak berubah.
              </p>
            </Card>

            <Drawer open={detail !== null} onClose={() => setDetail(null)}
              title={detail ? `Rumus biaya ${roleName(detail.role, catalog?.roles)}` : ""}
              subtitle={detail ? `Level ${rates.levels[detail.level]}, ${basisName}` : undefined}>
              {detail && (
                <div className="grid gap-5 px-6 py-5 text-sm">
                  <dl className="grid gap-3">
                    {[
                      ["Rentang gaji", `Rp${jt(rates.roles[detail.role]?.[detail.level][0] ?? 0)}–${jt(rates.roles[detail.role]?.[detail.level][1] ?? 0)} jt per bulan`],
                      ["Gaji median", `Rp${jt(detail.salary)} jt`],
                      ["Pengali", `${jt(detail.multiplier)} × (${basisName})`],
                      ["Biaya per FTE", `${rupiah(detail.perFte)} per bulan`],
                      ["FTE hasil hitung", `${fte(detail.computedFte)} FTE (${methodName})`],
                      ["Biaya baseline", `${rupiah(detail.computedMonthly)} per bulan`],
                      ["FTE dengan AI", detail.assistedFte === null ? "Tidak tersedia" : `${fte(detail.assistedFte)} FTE`],
                      ["Skenario biaya dengan AI", `${rupiah(detail.assistedMonthly)} per bulan`],
                      ["Potensi efisiensi", `${rupiah(detail.potentialMonthly)} per bulan`],
                      ["FTE diminta", detail.requestedFte === null ? "Belum diisi" : `${fte(detail.requestedFte)} FTE`],
                      ["Selisih selama periode", `${rupiah(detail.gapPeriod, true)} (${months} bulan)`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                        <dt className="text-muted">{k}</dt><dd className="tabular text-right text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="rounded-lg bg-canvas px-4 py-3 font-mono text-xs leading-relaxed">
                    biaya per bulan = FTE × gaji median × pengali<br />
                    selisih = (FTE diminta − FTE hasil hitung) × biaya per FTE
                  </p>
                  <div>
                    <p className="font-medium text-ink">Dasar angka</p>
                    <p className="mt-1 text-muted">{rates.roles[detail.role]?.basis}</p>
                    <ul className="mt-2 space-y-1">
                      {rates.sources.map((s) => (
                        <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent-700 hover:underline">{s.name}</a><span className="text-muted">, {s.date}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Drawer>
          </>
        );
      }}
    </WithRun>
  );
}
