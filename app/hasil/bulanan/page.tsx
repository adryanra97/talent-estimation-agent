"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WithRun } from "@/components/result-guard";
import { Card, PageHeader, RoleBadge } from "@/components/ui";
import { ROLE_COLOR, fte, month } from "@/lib/format";

export default function MonthlyPage() {
  const [method, setMethod] = useState<"bottom_up" | "ucp">("bottom_up");
  return (
    <WithRun>
      {(run) => {
        const data = run.monthly.map((m) => ({ month: month(m.month), ...m[method] }));
        return (
          <>
            <PageHeader
              title="Per Bulan"
              description="Effort tiap item disebar ke bulan sesuai hari kerjanya. FTE bulan = person-days bulan dibagi hari kerja efektif bulan itu."
              actions={
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
              }
            />
            <Card title={`FTE per bulan, metode ${method === "ucp" ? "UCP" : "bottom-up"}`}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5b6475" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#5b6475" }} />
                    <Tooltip formatter={(v: number) => fte(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {run.roles.map((r) => (
                      <Bar key={r} dataKey={r} stackId="a" fill={ROLE_COLOR[r] ?? "#64748b"} name={r} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">Role</th>
                      {run.monthly.map((m) => (
                        <th key={m.month} className="py-2 pr-3 text-right font-medium">
                          {month(m.month)}
                        </th>
                      ))}
                      <th className="py-2 text-right font-medium">Puncak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.roles.map((r) => {
                      const values = run.monthly.map((m) => m[method][r] ?? 0);
                      return (
                        <tr key={r} className="border-b border-line">
                          <td className="py-2 pr-3"><RoleBadge role={r} /></td>
                          {values.map((v, i) => (
                            <td key={i} className="tabular py-2 pr-3 text-right">{fte(v)}</td>
                          ))}
                          <td className="tabular py-2 text-right font-medium">{fte(Math.max(0, ...values))}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-canvas font-medium">
                      <td className="py-2 pr-3">Total</td>
                      {run.monthly.map((m) => (
                        <td key={m.month} className="tabular py-2 pr-3 text-right">
                          {fte(Object.values(m[method]).reduce((a, b) => a + b, 0))}
                        </td>
                      ))}
                      <td />
                    </tr>
                    <tr className="text-xs text-muted">
                      <td className="py-2 pr-3">Hari kerja</td>
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
