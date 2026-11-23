"use client";

import { WithRun } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { ExecPanel, Exhibit } from "@/components/summary-exhibits";
import { Button, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
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
  const [showTrace, setShowTrace] = useState(false);
  return (
    <WithRun>
      {(run) => {
        const inView = new Set(visibleRoles(run, catalog, teamView));
        const inTeam = run.findings.filter((f) => !f.role || inView.has(f.role));
        const kinds = [...new Set(inTeam.map((f) => f.kind))];
        const findings = inTeam
          .filter((f) => kind === "all" || f.kind === kind)
          .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
        const high = inTeam.filter((f) => f.severity === "Tinggi").length;
        const medium = inTeam.filter((f) => f.severity === "Sedang").length;
        const byKind = kinds.map((k) => ({ kind: k, count: inTeam.filter((f) => f.kind === k).length })).sort((p, q) => q.count - p.count);
        const top = byKind[0];
        const maxKind = Math.max(1, ...byKind.map((k) => k.count));
        const label = (k: string) => FINDING_LABEL[k] ?? k;
        const assumptions: [string, string][] = [
          [`${fte(run.parameters.phm, 1)}`, "jam per poin UCP (PHM)"],
          [`${fte(run.parameters.hours_per_day, 0)} × ${fte(run.parameters.days_per_month, 0)}`, "jam per hari × hari kerja per bulan"],
          [fte(run.parameters.support_factor), "bobot peran pendukung"],
          [`±${Math.round(run.parameters.tolerance * 100)}%`, "toleransi dianggap selaras"],
        ];
        return (
          <>
            <PageHeader
              title="Temuan & asumsi"
              description="Hal yang perlu dicek, asumsi yang dipakai, dan jejak keputusan setiap agent."
              actions={<TeamFilter run={run} />}
            />
            <ExecPanel id="tl-findings-answer" tone={high > 0 ? "is-under" : inTeam.length ? "is-over" : "is-fit"}
              kicker={`Temuan agent · ${inView.size} role`}
              lead={inTeam.length === 0 ? "Tidak ada temuan untuk cakupan ini" : high > 0 ? `${high} temuan prioritas tinggi perlu dicek lebih dulu` : "Tidak ada temuan prioritas tinggi"}
              value={String(inTeam.length)} unit="temuan"
              tail={top ? <>{medium} prioritas sedang. Paling sering muncul: {label(top.kind).toLowerCase()} ({top.count} temuan).</> : undefined}
              side={byKind.map((k) => ({ label: label(k.kind), value: String(k.count) }))}
              note="Temuan tidak mengubah angka secara otomatis. Item yang perlu dinilai ulang bisa ditandai di Breakdown WBS."
            />

            {byKind.length > 0 && (
              <Exhibit n={1} id="tl-findings-kinds"
                title={top ? `${label(top.kind)} paling sering muncul, ${top.count} dari ${inTeam.length} temuan` : "Jenis temuan"}
                source="Sumber: Reviewer Agent dan Reconciler. Pilih satu jenis untuk menyaring daftar di bawah.">
                <div className="tl-kind-bars" role="group" aria-label="Saring menurut jenis temuan">
                  {byKind.map((k) => (
                    <button key={k.kind} type="button" aria-pressed={kind === k.kind} onClick={() => setKind(kind === k.kind ? "all" : k.kind)}
                      className="tl-kind-bar" data-kind={k.kind}>
                      <span className="tl-kind-bar-label">{label(k.kind)}</span>
                      <span className="tl-kind-bar-track"><i style={{ width: `${(k.count / maxKind) * 100}%` }} /></span>
                      <b>{k.count}</b>
                    </button>
                  ))}
                </div>
              </Exhibit>
            )}

            <div className="tl-findings-layout">
              <section aria-labelledby="tl-findings-list-title">
                <div className="tl-findings-head">
                  <h2 id="tl-findings-list-title">{kind === "all" ? `Semua temuan (${findings.length})` : `${label(kind)} (${findings.length})`}</h2>
                  {kind !== "all" && <button type="button" className="tl-findings-reset" onClick={() => setKind("all")}>Tampilkan semua</button>}
                </div>
                {findings.length === 0 ? (
                  <p className="text-sm text-muted">Tidak ada temuan.</p>
                ) : (
                  <ul className="tl-finding-list">
                    {findings.map((f, i) => (
                      <li key={i} className="tl-finding" data-kind={f.kind}>
                        <div className="tl-finding-meta">
                          <span className="tl-finding-kind">{label(f.kind)}</span>
                          <StatusBadge tone={f.severity === "Tinggi" ? "bad" : f.severity === "Sedang" ? "warn" : "neutral"}>{f.severity}</StatusBadge>
                          {f.item_id && <span className="tabular text-xs text-muted">WBS {f.item_id}</span>}
                          {f.role && <RoleBadge role={f.role} name={catalog?.roles[f.role]?.name} />}
                        </div>
                        <p className="tl-finding-message">{f.message}</p>
                        {f.source && <p className="tl-finding-source">Sumber: {f.source}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="tl-findings-aside">
                <section aria-labelledby="tl-assumptions-title" className="tl-assumptions">
                  <h2 id="tl-assumptions-title">Asumsi perhitungan</h2>
                  <dl>
                    {assumptions.map(([v, t]) => <div key={t}><dd>{v}</dd><dt>{t}</dt></div>)}
                  </dl>
                  <p>Rating faktor UCP bawaan 3, hanya diubah bila ada bukti di dokumen.</p>
                </section>
                <section aria-labelledby="tl-trace-title" className="tl-trace">
                  <h2 id="tl-trace-title">Jejak keputusan agent</h2>
                  <ol>
                    {(showTrace ? run.trace : run.trace.slice(0, 8)).map((t, i) => (
                      <li key={i}>
                        <p><strong>{t.agent}</strong> {ACTION_LABEL[t.action] ?? t.action}</p>
                        {t.detail && <p className="tl-trace-detail">{t.detail}</p>}
                      </li>
                    ))}
                  </ol>
                  {run.trace.length > 8 && (
                    <Button variant="secondary" size="sm" onClick={() => setShowTrace(!showTrace)}>
                      {showTrace ? "Tampilkan 8 langkah pertama" : `Lihat semua ${run.trace.length} langkah`}
                    </Button>
                  )}
                </section>
              </aside>
            </div>
          </>
        );
      }}
    </WithRun>
  );
}
