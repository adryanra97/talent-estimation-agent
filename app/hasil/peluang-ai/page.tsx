"use client";

import { useMemo, useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Button, Card, EmptyState, InfoTip, PageHeader, RoleBadge, StatusBadge, inputBase, inputClass } from "@/components/ui";
import { fte, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";

export default function AiPage() {
  const { catalog, update, teamView } = useStore();
  const [role, setRole] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 25;
  const labels = useMemo(
    () => Object.fromEntries((catalog?.ai_categories ?? []).map((c) => [c.key, c.label])),
    [catalog],
  );
  return (
    <WithRun>
      {(run) => {
        if (!run.ai_enabled) {
          return (
            <EmptyState
              title="Analisis bantuan AI dimatikan"
              description="Aktifkan Analisis peluang bantuan AI di halaman Validasi Baru, lalu jalankan ulang."
              href="/validasi"
              action="Ke Validasi Baru"
            />
          );
        }
        const groups = visibleGroups(run, catalog, teamView);
        const inView = new Set(groups.flatMap((g) => g.roles));
        const summaries = Object.fromEntries(run.ai_summary.map((a) => [a.role, a]));
        const names = Object.fromEntries(run.breakdown.map((r) => [`${r.item_id}|${r.role}`, r.item_name]));
        const tasks = run.ai_tasks
          .map((t, index) => ({ ...t, index }))
          .filter((t) => inView.has(t.role) && (role === "all" || t.role === role) && (confidence === "all" || t.confidence === confidence))
          .filter((t) => t.saving > 0);
        return (
          <>
            <PageHeader
              title="Peluang Bantuan AI"
              description="Skenario terpisah: bagian pekerjaan yang bisa lebih cepat dengan bantuan AI. Angka di Ringkasan FTE tidak berubah."
              actions={<TeamFilter run={run} />}
            />
            {groups.map((g) => (
            <section key={g.key} aria-label={`Tim ${g.label}`} className="mb-6">
              {(groups.length > 1 || teamView !== "all") && (
                <h2 className="mb-3 text-base font-semibold text-ink">
                  Tim {g.label}
                </h2>
              )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {g.roles.map((r) => summaries[r]).filter(Boolean).map((a) => (
                <div key={a.role} className="rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <RoleBadge role={a.role} />
                    <span className="text-xs text-muted">{roleName(a.role, catalog?.roles)}</span>
                  </div>
                  <p className="mt-4 text-xs text-muted">FTE bottom-up, sekarang lalu dengan bantuan AI</p>
                  <p className="tabular text-2xl font-semibold text-ink">
                    {fte(a.bu_fte)} <span className="text-muted">→</span> {fte(a.bu_fte_assisted)}
                  </p>
                  <p className="tabular mt-1 text-sm text-muted">
                    UCP {fte(a.ucp_fte)} → {fte(a.ucp_fte_assisted)}
                  </p>
                  <p className="mt-3 text-sm">
                    <span className="font-medium text-accent-700">{pct(a.saving_share, 1)}</span>{" "}
                    <span className="text-muted">effort terbantu</span>
                  </p>
                  {a.top_skills.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-xs font-medium text-muted">Capability paling terbantu</p>
                      <ul className="mt-1 space-y-0.5 text-xs text-ink">
                        {a.top_skills.slice(0, 3).map((s) => (
                          <li key={s}>{s.split(" · ").at(-1)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </section>
            ))}

            <Card
              title="Detail tugas"
              description="Persentase hemat diambil dari tabel kategori, bukan dari model. Boleh diubah."
              actions={
                <div className="flex gap-2">
                  <select aria-label="Filter role" className={`${inputBase} w-auto`} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="all">Semua role</option>
                    {[...inView].map((r) => (
                      <option key={r} value={r}>{roleName(r, catalog?.roles)}</option>
                    ))}
                  </select>
                  <select aria-label="Filter keyakinan" className={`${inputBase} w-auto`} value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                    <option value="all">Semua keyakinan</option>
                    <option>Tinggi</option>
                    <option>Sedang</option>
                    <option>Rendah</option>
                  </select>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">Item dan tugas</th>
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 font-medium">Capability</th>
                      <th className="py-2 pr-3 font-medium">Kategori bantuan</th>
                      <th className="py-2 pr-3 text-right font-medium">Bobot</th>
                      <th className="py-2 pr-3 text-right font-medium">
                        <span className="inline-flex items-center gap-1">Hemat <InfoTip text="Persentase waktu tugas yang dapat dihemat. Nilai bawaan diambil dari kategori." /></span>
                      </th>
                      <th className="py-2 font-medium">Keyakinan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? tasks : tasks.slice(0, LIMIT)).map((t) => (
                      <tr key={t.index} className="border-b border-line align-top">
                        <td className="py-2.5 pr-3">
                          <p className="text-ink">{t.task}</p>
                          <p className="text-xs text-muted">
                            {t.item_id} {names[`${t.item_id}|${t.role}`]}
                            {t.prerequisite ? `. Prasyarat: ${t.prerequisite}` : ""}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3"><RoleBadge role={t.role} /></td>
                        <td className="py-2.5 pr-3 text-xs">
                          <span className="block text-ink">{t.pillar || "-"}</span>
                          <span className="text-muted">{t.skill}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink">{labels[t.category] ?? t.category}</td>
                        <td className="tabular py-2.5 pr-3 text-right">{pct(t.weight)}</td>
                        <td className="py-2.5 pr-3 text-right">
                          <input
                            aria-label="Persentase hemat"
                            type="number"
                            min={0}
                            max={100}
                            className="tabular w-16 rounded-md border border-line bg-white px-2 py-1 text-right text-sm"
                            defaultValue={Math.round(t.saving * 100)}
                            onBlur={(e) => {
                              const v = Math.min(100, Math.max(0, Number(e.target.value))) / 100;
                              if (v !== t.saving) {
                                update({ ...run, ai_tasks: run.ai_tasks.map((x, i) => (i === t.index ? { ...x, saving: v } : x)) });
                              }
                            }}
                          />
                        </td>
                        <td className="py-2.5">
                          <StatusBadge tone={t.confidence === "Tinggi" ? "good" : t.confidence === "Rendah" ? "warn" : "neutral"}>{t.confidence}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tasks.length > LIMIT && (
                <div className="mt-3 flex justify-center">
                  <Button variant="secondary" size="sm" onClick={() => setShowAll(!showAll)}>
                    {showAll ? `Tampilkan ${LIMIT} tugas pertama` : `Tampilkan semua ${tasks.length} tugas`}
                  </Button>
                </div>
              )}
              <p className="mt-3 text-xs text-muted">
                Tugas dengan hemat 0% (desain, keputusan, koordinasi) disembunyikan. Pakai filter role untuk mempersempit daftar.
              </p>
            </Card>
          </>
        );
      }}
    </WithRun>
  );
}
