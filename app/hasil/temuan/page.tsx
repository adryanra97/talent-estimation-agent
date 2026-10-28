"use client";

import { WithRun } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Card, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { useState } from "react";
import { FINDING_LABEL, fte } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleRoles } from "@/lib/teams";

const ORDER = ["Tinggi", "Sedang", "Rendah"];

/** Plain names for the skill identifiers recorded in the trace. */
const ACTION_LABEL: Record<string, string> = {
  parse_wbs: "membaca WBS",
  parse_request: "membaca dokumen permintaan",
  classify_item: "menilai item per role",
  "ucp_calc + bu_calc": "menghitung UCP dan bottom-up",
  "reconcile + check_quality": "membandingkan dan memeriksa hasil",
  reclassify: "menilai ulang atas permintaan Reviewer",
  "reclassify (manusia)": "menilai ulang atas permintaan reviewer manusia",
  "assess_ai_assist + calc_ai_savings": "memetakan tugas yang bisa dibantu AI",
  draft_message: "menyusun draf pesan",
};

export default function FindingsPage() {
  const { catalog, teamView } = useStore();
  const [kind, setKind] = useState("all");
  return (
    <WithRun>
      {(run) => {
        const inView = new Set(visibleRoles(run, catalog, teamView));
        const inTeam = run.findings.filter((f) => !f.role || inView.has(f.role));
        const kinds = [...new Set(inTeam.map((f) => f.kind))];
        const findings = inTeam
          .filter((f) => kind === "all" || f.kind === kind)
          .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
        return (
          <>
            <PageHeader
              title="Temuan & Asumsi"
              description="Hal yang perlu dicek, dan jejak keputusan setiap agent."
              actions={<TeamFilter run={run} />}
            />
            <div className="grid gap-6 lg:grid-cols-5">
              <Card
                className="lg:col-span-3"
                title={`Temuan (${findings.length})`}
                actions={
                  kinds.length > 1 && (
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jenis temuan">
                      {["all", ...kinds].map((k) => (
                        <button
                          key={k}
                          aria-pressed={kind === k}
                          onClick={() => setKind(k)}
                          className={`rounded-md px-2.5 py-1 text-xs ${kind === k ? "bg-accent-50 font-medium text-accent-700" : "text-muted ring-1 ring-line hover:text-ink"}`}
                        >
                          {k === "all" ? "Semua" : (FINDING_LABEL[k] ?? k)}{" "}
                          <span className="tabular">{k === "all" ? inTeam.length : inTeam.filter((f) => f.kind === k).length}</span>
                        </button>
                      ))}
                    </div>
                  )
                }
              >
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
                          {f.role && <RoleBadge role={f.role} name={catalog?.roles[f.role]?.name} />}
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
                    <li>PHM {fte(run.parameters.phm, 1)} jam per poin UCP</li>
                    <li>
                      {fte(run.parameters.hours_per_day, 0)} jam per hari, {fte(run.parameters.days_per_month, 0)} hari kerja per bulan
                    </li>
                    <li>Bobot peran pendukung {fte(run.parameters.support_factor)}</li>
                    <li>Toleransi selaras ±{Math.round(run.parameters.tolerance * 100)}%</li>
                    <li>Rating faktor UCP bawaan 3, diubah hanya dengan bukti</li>
                  </ul>
                </Card>
                <Card title="Jejak keputusan agent">
                  <ol className="space-y-3 text-sm">
                    {run.trace.map((t, i) => (
                      <li key={i} className="border-l-2 border-accent-200 pl-3">
                        <p className="font-medium text-ink">
                          {t.agent} <span className="font-normal text-muted">{ACTION_LABEL[t.action] ?? t.action}</span>
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
