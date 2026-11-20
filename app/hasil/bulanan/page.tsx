"use client";

import { Fragment, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Card, PageHeader, RoleBadge } from "@/components/ui";
import { date, fte, month } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";

const REPORT_COLORS = ["#205fa9", "#278b9e", "#477fae", "#62aaba", "#39728c", "#7a9db6", "#267b82", "#91b6c9"];

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
            <Card title={`Distribusi kapasitas · ${method === "ucp" ? "UCP" : "bottom-up"}`}
              description="Area bertumpuk menunjukkan komposisi kebutuhan tiap role selama periode proyek. Pilih metode untuk membandingkan.">
              <div className="tl-monthly-chart" aria-label="Visualisasi kebutuhan FTE bulanan menurut role">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 15, right: 15, left: 0, bottom: 8 }}>
                    <defs>
                      {roles.map((role, index) => {
                        const color = REPORT_COLORS[index % REPORT_COLORS.length];
                        return <linearGradient key={role} id={`monthly-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.88} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.47} />
                        </linearGradient>;
                      })}
                    </defs>
                    <CartesianGrid stroke="#e5e0ec" strokeDasharray="2 6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#645d76" }} tickLine={false} axisLine={false} dy={12} />
                    <YAxis tick={{ fontSize: 12, fill: "#645d76" }} tickLine={false} axisLine={false} width={36} tickFormatter={(value: number) => fte(value)} />
                    <Tooltip formatter={(value: number, name: string) => [`${fte(value)} FTE`, name]}
                      contentStyle={{ border: "1px solid #e0d8eb", borderRadius: 12, boxShadow: "0 12px 30px #2a214012", fontSize: 12 }}
                      labelStyle={{ fontWeight: 700, color: "#29233f" }} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 24, lineHeight: "24px" }} />
                    {roles.map((role, index) => (
                      <Area key={role} type="monotone" dataKey={role} name={roleName(role, catalog?.roles)} stackId="total"
                        stroke={REPORT_COLORS[index % REPORT_COLORS.length]} strokeWidth={1.5}
                        fill={`url(#monthly-fill-${index})`} isAnimationActive={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="tl-report-footnote">Grafik menunjukkan FTE bulanan hasil pembagian effort pada periode proyek. Angka puncak menunjukkan bulan dengan kebutuhan paling tinggi, bukan kebutuhan rata-rata.</p>
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
            </Card>
          </>
        );
      }}
    </WithRun>
  );
}
