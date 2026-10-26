"use client";

import { Fragment, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Card, PageHeader, RoleBadge } from "@/components/ui";
import { date, fte, month, roleColor } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";

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
              description="Effort tiap item disebar ke bulan sesuai hari kerjanya. FTE bulan = person-days bulan dibagi hari kerja efektif bulan itu."
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
            <Card title={`FTE per bulan, metode ${method === "ucp" ? "UCP" : "bottom-up"}`}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5b6475" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#5b6475" }} />
                    <Tooltip formatter={(v: number) => fte(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {roles.map((r) => (
                      <Bar key={r} dataKey={r} stackId="a" fill={roleColor(r, run.roles.indexOf(r))} name={roleName(r, catalog?.roles)} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 overflow-x-auto">
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
                            <th colSpan={run.monthly.length + 2} scope="colgroup" className="sticky left-0 bg-surface pt-4 pb-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase">
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
