"use client";

import { Fragment, useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Exhibit } from "@/components/summary-exhibits";
import { PageHeader, RoleBadge } from "@/components/ui";
import { date, fte, month } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";

/** One small line per role on a shared scale; only the role that drives the peak month is coloured. */
function RolePanels({ months, series, focus }: {
  months: string[];
  series: { role: string; name: string; values: number[] }[];
  focus: string | null;
}) {
  const max = Math.max(0.1, ...series.flatMap((s) => s.values));
  const W = 220, H = 84, pad = 6;
  const x = (i: number) => (months.length < 2 ? W / 2 : pad + (i * (W - pad * 2)) / (months.length - 1));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <ul className="tl-role-panels" aria-label="FTE bulanan per role, skala sama">
      {series.map((s) => {
        const peak = Math.max(...s.values);
        const at = s.values.indexOf(peak);
        const on = s.role === focus;
        return (
          <li key={s.role} className={on ? "is-focus" : undefined}>
            <div className="tl-role-panel-head"><strong>{s.name}</strong><span>puncak {fte(peak)} · {months[at]}</span></div>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.name}: ${s.values.map((v, i) => `${months[i]} ${fte(v)} FTE`).join(", ")}`}>
              <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="tl-role-panel-base" />
              <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} className="tl-role-panel-line" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === at ? 4 : 2.5} className={i === at ? "tl-role-panel-peak" : "tl-role-panel-dot"} />)}
            </svg>
            <div className="tl-role-panel-axis" aria-hidden="true"><span>{months[0]}</span><span>{months[months.length - 1]}</span></div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MonthlyPage() {
  const [method, setMethod] = useState<"bottom_up" | "ucp">("bottom_up");
  const { catalog, teamView } = useStore();
  return (
    <WithRun>
      {(run) => {
        const data = run.monthly.map((m) => ({ month: month(m.month), ...m[method] }));
        const groups = visibleGroups(run, catalog, teamView);
        const roles = groups.flatMap((g) => g.roles);
        const grouped = groups.length > 1;
        const monthTotal = (m: (typeof run.monthly)[number], list: string[]) => list.reduce((a, r) => a + (m[method][r] ?? 0), 0);
        const { start, end } = run.project;
        const outside = new Set(
          run.breakdown
            .filter((r) => start && end && r.start && r.end && (r.start < start || r.end > end))
            .map((r) => r.item_id),
        );
        return (
          <>
            <PageHeader
              title="Per Bulan"
              description="Effort tiap item dibagi ke bulan sesuai hari kerjanya."
              actions={
                <>
                <TeamFilter run={run} />
                <div className="inline-flex rounded-lg border border-line bg-canvas p-1" role="group" aria-label="Metode">
                  {(
                    [
                      ["bottom_up", "Bottom-up"],
                      ["ucp", "UCP"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={method === value}
                      onClick={() => setMethod(value)}
                      className={`rounded-md px-4 py-1.5 text-sm ${method === value ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                </>
              }
            />
            <div className="tl-results-scope" aria-label="Ringkasan distribusi bulanan">
              <div className="tl-results-scope-stat"><strong>{run.monthly.length}</strong><span>Bulan analisis</span></div>
              <div className="tl-results-scope-stat"><strong>{fte(Math.max(0, ...run.monthly.map((m) => monthTotal(m, roles))))}</strong><span>Puncak FTE · {method === "ucp" ? "UCP" : "bottom-up"}</span></div>
              <div className="tl-results-scope-stat"><strong>{roles.length}</strong><span>Role pada grafik</span></div>
            </div>
            {outside.size > 0 && (
              <div role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">{outside.size} item WBS berada di luar periode analisis ({date(start)} s.d. {date(end)}).</p>
                <p className="mt-1">
                  Effort-nya tetap dihitung dalam FTE rata-rata, tetapi tidak tampil di grafik ini dan di FTE puncak. Ubah periode di
                  Validasi Baru lalu jalankan ulang bila periodenya kurang tepat. Item: {[...outside].slice(0, 8).join(", ")}
                  {outside.size > 8 ? ` dan ${outside.size - 8} lainnya` : ""}.
                </p>
              </div>
            )}
            {(() => {
              const months = run.monthly.map((m) => month(m.month));
              const totals = run.monthly.map((m) => monthTotal(m, roles));
              const peakAt = totals.indexOf(Math.max(0, ...totals));
              const series = roles.map((role) => ({ role, name: roleName(role, catalog?.roles), values: run.monthly.map((m) => m[method][role] ?? 0) }));
              const driver = peakAt >= 0 ? [...series].sort((p, q) => q.values[peakAt] - p.values[peakAt])[0] : undefined;
              return (
                <Exhibit n={1} id="tl-monthly-exhibit"
                  title={driver && peakAt >= 0 ? `${driver.name} menyumbang kebutuhan terbesar saat puncak ${months[peakAt]}` : "Kebutuhan bulanan per role"}
                  source={`Sumber: jadwal item WBS, metode ${method === "ucp" ? "UCP" : "bottom-up"}. Semua panel memakai skala yang sama; ungu menandai role dengan kontribusi terbesar di bulan puncak. Angka lengkap ada di tabel.`}>
                  <RolePanels months={months} series={series} focus={driver?.role ?? null} />
                </Exhibit>
              );
            })()}
              <div className="tl-evidence-table-wrap mt-8 overflow-x-auto" role="region" aria-label="Data FTE bulanan per role" tabIndex={0}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">Role</th>
                      {run.monthly.map((m) => (
                        <th key={m.month} className="py-2 pr-3 text-right font-medium">
                          {month(m.month)}
                        </th>
                      ))}
                      <th className="py-2 text-right font-medium">Puncak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <Fragment key={g.key}>
                        {grouped && (
                          <tr className="border-b border-line">
                            <th colSpan={run.monthly.length + 2} scope="colgroup" className="sticky left-0 bg-surface pt-4 pb-1.5 text-left text-sm font-semibold text-ink">
                              Tim {g.label}
                            </th>
                          </tr>
                        )}
                        {g.roles.map((r) => {
                          const values = run.monthly.map((m) => m[method][r] ?? 0);
                          return (
                            <tr key={r} className="border-b border-line">
                              <td className="sticky left-0 bg-surface py-2 pr-3"><RoleBadge role={r} name={roleName(r, catalog?.roles)} /></td>
                              {values.map((v, i) => (
                                <td key={i} className="tabular py-2 pr-3 text-right">{fte(v)}</td>
                              ))}
                              <td className="tabular py-2 text-right font-medium">{fte(Math.max(0, ...values))}</td>
                            </tr>
                          );
                        })}
                        {grouped && (
                          <tr className="border-b border-line text-muted">
                            <td className="sticky left-0 bg-surface py-2 pr-3 text-xs">Subtotal {g.label}</td>
                            {run.monthly.map((m) => (
                              <td key={m.month} className="tabular py-2 pr-3 text-right">{fte(monthTotal(m, g.roles))}</td>
                            ))}
                            <td className="tabular py-2 text-right">{fte(Math.max(0, ...run.monthly.map((m) => monthTotal(m, g.roles))))}</td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    <tr className="bg-canvas font-medium">
                      <td className="sticky left-0 bg-canvas py-2 pr-3">{teamView === "all" ? "Total" : `Total ${groups[0]?.label ?? ""}`}</td>
                      {run.monthly.map((m) => (
                        <td key={m.month} className="tabular py-2 pr-3 text-right">
                          {fte(monthTotal(m, roles))}
                        </td>
                      ))}
                      <td className="tabular py-2 text-right">{fte(Math.max(0, ...run.monthly.map((m) => monthTotal(m, roles))))}</td>
                    </tr>
                    <tr className="text-xs text-muted">
                      <td className="sticky left-0 bg-surface py-2 pr-3">Hari kerja</td>
                      {run.monthly.map((m) => (
                        <td key={m.month} className="tabular py-2 pr-3 text-right">{m.capacity_days}</td>
                      ))}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
          </>
        );
      }}
    </WithRun>
  );
}
