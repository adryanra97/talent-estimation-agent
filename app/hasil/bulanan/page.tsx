"use client";

import { WithRun, roleName } from "@/components/result-guard";
import { MethodNote, MethodSwitch } from "@/components/method-switch";
import { TeamFilter } from "@/components/team-filter";
import { ExecPanel, Exhibit } from "@/components/summary-exhibits";
import { PageHeader, RoleBadge } from "@/components/ui";
import { date, fte, month, roleColor } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";

/** One small area chart per role on a shared scale, each in its role colour. */
function RolePanels({ months, series, focus }: {
  months: string[];
  series: { role: string; name: string; color: string; values: number[] }[];
  focus: string | null;
}) {
  const max = Math.max(0.1, ...series.flatMap((s) => s.values));
  const W = 240, H = 96, pad = 8;
  const x = (i: number) => (months.length < 2 ? W / 2 : pad + (i * (W - pad * 2)) / (months.length - 1));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <ul className="tl-role-panels" aria-label="FTE bulanan per role, skala sama">
      {series.map((s) => {
        const peak = Math.max(...s.values);
        const at = s.values.indexOf(peak);
        const line = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const area = `${x(0)},${H - pad} ${line} ${x(s.values.length - 1)},${H - pad}`;
        const gid = `tl-grad-${s.role}`;
        return (
          <li key={s.role} className={s.role === focus ? "is-focus" : undefined} style={{ "--role": s.color } as React.CSSProperties}>
            <div className="tl-role-panel-head">
              <strong>{s.name}</strong>
              {s.role === focus && <em>Penyumbang terbesar</em>}
            </div>
            <p className="tl-role-panel-peak-figure"><b>{fte(peak)}</b> <span>FTE puncak · {months[at]}</span></p>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.name}: ${s.values.map((v, i) => `${months[i]} ${fte(v)} FTE`).join(", ")}`}>
              <defs>
                <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity=".34" />
                  <stop offset="100%" stopColor={s.color} stopOpacity=".02" />
                </linearGradient>
              </defs>
              <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="tl-role-panel-base" />
              <polygon points={area} fill={`url(#${gid})`} />
              <polyline points={line} className="tl-role-panel-line" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === at ? 4.5 : 2.5} className={i === at ? "tl-role-panel-peak" : "tl-role-panel-dot"} />)}
            </svg>
            <div className="tl-role-panel-axis" aria-hidden="true"><span>{months[0]}</span><span>{months[months.length - 1]}</span></div>
          </li>
        );
      })}
    </ul>
  );
}

/** Role × month grid shaded by FTE, so the busiest cells stand out at a glance. */
function Heatmap({ months, rows, max }: { months: string[]; rows: { key: string; label: React.ReactNode; values: number[]; kind?: "group" | "total" }[]; max: number }) {
  const shade = (v: number) => Math.min(1, v / Math.max(0.1, max));
  return (
    <div className="tl-heatmap-wrap" role="region" aria-label="FTE per role per bulan" tabIndex={0}>
      <table className="tl-heatmap">
        <thead>
          <tr><th scope="col">Role</th>{months.map((m) => <th key={m} scope="col">{m}</th>)}<th scope="col">Puncak</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.kind ? `is-${r.kind}` : undefined}>
              <th scope="row">{r.label}</th>
              {r.values.map((v, i) => {
                const t = r.kind ? 0 : shade(v);
                return (
                  <td key={i} style={r.kind ? undefined : { background: `rgba(122,41,215,${(0.06 + t * 0.84).toFixed(3)})`, color: t > 0.5 ? "#fff" : "#17141d" }}>
                    {fte(v)}
                  </td>
                );
              })}
              <td className="tl-heatmap-peak">{fte(Math.max(0, ...r.values))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MonthlyPage() {
  const { catalog, teamView, costSettings } = useStore();
  const method = costSettings.method === "bu" ? "bottom_up" : "ucp";
  return (
    <WithRun>
      {(run) => {
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
              title="Per bulan"
              description="Effort tiap item dibagi ke bulan sesuai hari kerjanya."
              actions={
                <>
                <TeamFilter run={run} />
                <MethodSwitch />
                </>
              }
            />
            <MethodNote />
            {(() => {
              const months = run.monthly.map((m) => month(m.month));
              const totals = run.monthly.map((m) => monthTotal(m, roles));
              const peak = Math.max(0, ...totals);
              const peakAt = totals.indexOf(peak);
              const low = Math.min(...totals);
              const avg = totals.length ? totals.reduce((p, q) => p + q, 0) / totals.length : 0;
              const top = peakAt >= 0 ? [...roles].sort((p, q) => (run.monthly[peakAt][method][q] ?? 0) - (run.monthly[peakAt][method][p] ?? 0))[0] : undefined;
              return (
                <ExecPanel id="tl-monthly-answer"
                  kicker={`Puncak kebutuhan · ${roles.length} role · metode ${method === "ucp" ? "UCP" : "bottom-up"}`}
                  lead={peakAt >= 0 ? `Kebutuhan tertinggi jatuh di ${months[peakAt]}` : "Belum ada data bulanan"}
                  value={fte(peak)} unit="FTE"
                  tail={top ? <>{roleName(top, catalog?.roles)} menyumbang {fte(run.monthly[peakAt][method][top] ?? 0)} FTE di bulan itu. Rata-rata selama {months.length} bulan {fte(avg)} FTE, terendah {fte(low)} FTE.</> : undefined}
                  side={[...months.map((m, i) => ({ label: m, value: `${fte(totals[i])} FTE`, strong: i === peakAt })), { label: "Selisih puncak dan terendah", value: `${fte(peak - low)} FTE` }]}
                  note="Bulan dengan angka tebal adalah puncak. Pastikan talent tersedia di bulan itu, bukan hanya rata-ratanya."
                />
              );
            })()}
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
              const series = roles.map((role, i) => ({ role, name: roleName(role, catalog?.roles), color: roleColor(role, i), values: run.monthly.map((m) => m[method][role] ?? 0) }));
              const driver = peakAt >= 0 ? [...series].sort((p, q) => q.values[peakAt] - p.values[peakAt])[0] : undefined;
              return (
                <Exhibit n={1} id="tl-monthly-exhibit"
                  title={driver && peakAt >= 0 ? `${driver.name} menyumbang kebutuhan terbesar saat puncak ${months[peakAt]}` : "Kebutuhan bulanan per role"}
                  source={`Sumber: jadwal item WBS, metode ${method === "ucp" ? "UCP" : "bottom-up"}. Semua panel memakai skala yang sama. Warna mengikuti warna role di seluruh laporan.`}>
                  <RolePanels months={months} series={series} focus={driver?.role ?? null} />
                </Exhibit>
              );
            })()}
            {(() => {
              const months = run.monthly.map((m) => month(m.month));
              const totals = run.monthly.map((m) => monthTotal(m, roles));
              const peakAt = totals.indexOf(Math.max(0, ...totals));
              const vals = (r: string) => run.monthly.map((m) => m[method][r] ?? 0);
              const max = Math.max(0.1, ...roles.flatMap(vals));
              const busy = roles.filter((r) => { const v = vals(r); return v.indexOf(Math.max(...v)) === peakAt; }).length;
              type Row = { key: string; label: React.ReactNode; values: number[]; kind?: "group" | "total" };
              const rows: Row[] = groups.flatMap((g): Row[] => [
                ...g.roles.map((r) => ({ key: r, label: <RoleBadge role={r} name={roleName(r, catalog?.roles)} />, values: vals(r) })),
                ...(grouped ? [{ key: `sub-${g.key}`, label: `Subtotal ${g.label}`, values: run.monthly.map((m) => monthTotal(m, g.roles)), kind: "group" as const }] : []),
              ]);
              rows.push({ key: "total", label: teamView === "all" ? "Total" : `Total ${groups[0]?.label ?? ""}`, values: totals, kind: "total" as const });
              return (
                <Exhibit n={2} id="tl-monthly-heatmap"
                  title={peakAt >= 0 ? `${months[peakAt]} paling padat untuk ${busy} dari ${roles.length} role` : "FTE per role per bulan"}
                  source={`Sumber: jadwal item WBS, metode ${method === "ucp" ? "UCP" : "bottom-up"}. Makin gelap sel, makin besar FTE. Hari kerja per bulan: ${run.monthly.map((m) => `${month(m.month)} ${m.capacity_days}`).join(", ")}.`}>
                  <Heatmap months={months} rows={rows} max={max} />
                </Exhibit>
              );
            })()}
          </>
        );
      }}
    </WithRun>
  );
}
