"use client";

import { WithRun } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Card, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { FINDING_LABEL } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleRoles } from "@/lib/teams";

const ORDER = ["Tinggi", "Sedang", "Rendah"];

export default function FindingsPage() {
  const { catalog, teamView } = useStore();
  return (
    <WithRun>
      {(run) => {
        const inView = new Set(visibleRoles(run, catalog, teamView));
        const findings = run.findings.filter((f) => !f.role || inView.has(f.role)).sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
        return (
          <>
            <PageHeader
              title="Temuan & Asumsi"
              description="Hal yang perlu dicek, dan jejak keputusan setiap agent."
              actions={<TeamFilter run={run} />}
            />
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3" title={`Temuan (${findings.length})`}>
                {findings.length === 0 ? (
                  <p className="text-sm text-muted">Tidak ada temuan.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {findings.map((f, i) => (
                      <li key={i} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={f.severity === "Tinggi" ? "bad" : f.severity === "Sedang" ? "warn" : "neutral"}>
                            {f.severity}
                          </StatusBadge>
                          <span className="text-sm font-medium text-ink">{FINDING_LABEL[f.kind] ?? f.kind}</span>
                          {f.item_id && <span className="tabular text-xs text-muted">{f.item_id}</span>}
                          {f.role && <RoleBadge role={f.role} />}
                        </div>
                        <p className="mt-1 text-sm text-ink">{f.message}</p>
                        {f.source && <p className="mt-0.5 text-xs text-muted">Sumber: {f.source}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <div className="space-y-6 lg:col-span-2">
                <Card title="Asumsi perhitungan">
                  <ul className="space-y-1.5 text-sm text-ink">
                    <li>PHM {run.parameters.phm} jam per poin UCP</li>
                    <li>{run.parameters.hours_per_day} jam per hari, {run.parameters.days_per_month} hari kerja per bulan</li>
                    <li>Bobot peran pendukung {run.parameters.support_factor}</li>
                    <li>Toleransi selaras ±{Math.round(run.parameters.tolerance * 100)}%</li>
                    <li>Rating faktor UCP bawaan 3, diubah hanya dengan bukti</li>
                  </ul>
                </Card>
                <Card title="Jejak keputusan agent">
                  <ol className="space-y-3 text-sm">
                    {run.trace.map((t, i) => (
                      <li key={i} className="border-l-2 border-accent-200 pl-3">
                        <p className="font-medium text-ink">
                          {t.agent} <span className="font-normal text-muted">({t.action})</span>
                        </p>
                        {t.detail && <p className="text-muted">{t.detail}</p>}
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </WithRun>
  );
}
