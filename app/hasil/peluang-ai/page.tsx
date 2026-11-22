"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
              description="Skenario terpisah: bagian pekerjaan yang bisa lebih cepat dengan bantuan AI. Angka di Ringkasan keputusan tidak berubah."
              actions={<TeamFilter run={run} />}
            />
            <div className="tl-results-scope" aria-label="Ringkasan skenario AI">
              <div className="tl-results-scope-stat">
                <strong>{fte(groups.flatMap((g) => g.roles).reduce((total, r) => total + (summaries[r]?.bu_fte ?? 0), 0))}</strong>
                <span>Baseline bottom-up · FTE</span>
              </div>
              <div className="tl-results-scope-stat">
                <strong>{fte(groups.flatMap((g) => g.roles).reduce((total, r) => total + (summaries[r]?.bu_fte_assisted ?? 0), 0))}</strong>
                <span>Skenario dengan bantuan AI · FTE</span>
              </div>
              <div className="tl-results-scope-stat">
                <strong>{fte(groups.flatMap((g) => g.roles).reduce((total, r) => total + (summaries[r]?.saved_person_days ?? 0), 0), 1)}</strong>
                <span>Potensi person-days terbantu</span>
              </div>
            </div>

            <div className="tl-summary-section-head">
              <div>
                <p className="tl-summary-eyebrow">AI AUGMENTATION / SCENARIO</p>
                <h2>Dampak bantuan AI per role</h2>
              </div>
              <p>Skenario menunjukkan potensi efisiensi, bukan keputusan otomatis untuk mengurangi talent. Baseline di Ringkasan tetap sama.</p>
            </div>
            <div className="tl-ai-role-list" aria-label="Perbandingan baseline dan skenario AI per role">
              {groups.map((g) => (
                <section key={g.key} className="tl-ai-role-group">
                  {(groups.length > 1 || teamView !== "all") && (
                    <h3 className="tl-ai-group-title">Tim {g.label}</h3>
                  )}
                  {g.roles.map((roleCode) => summaries[roleCode]).filter(Boolean).map((a) => (
                    <div key={a.role} className="tl-ai-role">
                      <div>
                        <strong>{roleName(a.role, catalog?.roles)}</strong>
                        <small>{a.role}{a.top_skills.length ? ` · ${a.top_skills.slice(0, 2).map((s) => s.split(" · ").at(-1)).join(", ")}` : ""}</small>
                      </div>
                      <div className="tl-ai-role-change">
                        <span><small>Baseline BU</small><strong>{fte(a.bu_fte)}</strong></span>
                        <span className="tl-ai-role-arrow" aria-hidden="true">→</span>
                        <span><small>Dengan AI</small><strong>{fte(a.bu_fte_assisted)}</strong></span>
                      </div>
                      <div className="tl-ai-role-savings"><strong>{pct(a.saving_share, 1)}</strong><small>effort berpotensi terbantu</small></div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
            <p className="tl-report-footnote" style={{ marginBottom: 28 }}>
              Angka tersebut menggunakan kategori dan asumsi penghematan tugas yang dapat diedit pada tabel di bawah. Hasil aktual tetap memerlukan validasi.
            </p>
            <Link href="/hasil/biaya" className="tl-ai-cost-next">
              <span><small>LANGKAH TERAKHIR / COST INTELLIGENCE</small><strong>Bandingkan baseline biaya dengan skenario bantuan AI</strong><em>Rate yang sama diterapkan pada kedua skenario, agar perubahan effort dapat dihitung sebagai potensi biaya kapasitas.</em></span>
              <ArrowRight size={21} aria-hidden />
            </Link>

            <Card
              title="Detail tugas"
              description="Persentase hemat diambil dari tabel kategori, bukan dari model. Boleh diubah."
              actions={
                <div className="flex flex-wrap gap-2">
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
                  {(role !== "all" || confidence !== "all") && (
                    <button type="button" className="text-xs font-semibold text-accent-700 underline underline-offset-4"
                      onClick={() => { setRole("all"); setConfidence("all"); setShowAll(false); }}>
                      Hapus filter
                    </button>
                  )}
                </div>
              }
            >
              <p className="mb-3 text-xs text-muted">{tasks.length} tugas sesuai filter · Geser tabel pada layar kecil untuk melihat semua atribut.</p>
              <div className="overflow-x-auto" role="region" aria-label="Tabel potensi bantuan AI per tugas" tabIndex={0}>
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
                            aria-label={`Persentase hemat untuk ${t.task}`}
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
              {tasks.length === 0 && (
                <p role="status" className="tl-results-empty-filter">Tidak ada tugas dengan potensi penghematan sesuai filter yang dipilih.</p>
              )}
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
