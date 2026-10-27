"use client";

import { ChevronDown } from "lucide-react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { EmptyState, PageHeader, RoleBadge } from "@/components/ui";
import { num } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleGroups } from "@/lib/teams";
import type { RunResult } from "@/lib/types";

function LevelMeter({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Level ${level} dari 5`}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-3 w-2 rounded-[2px] ${n <= level ? "bg-accent-600" : "bg-line"}`} />
        ))}
      </span>
      <span className="tabular text-sm font-semibold text-ink">{level}</span>
    </span>
  );
}

interface SkillNeed {
  pillar: string;
  skill: string;
  levels: number[];
  items: { id: string; name: string; level: number }[];
}

function needsByRole(run: RunResult): Record<string, SkillNeed[]> {
  const result: Record<string, Map<string, SkillNeed>> = {};
  for (const row of run.breakdown) {
    for (const c of row.capabilities ?? []) {
      const map = (result[row.role] ??= new Map());
      const need = map.get(c.skill) ?? { pillar: c.pillar, skill: c.skill, levels: [], items: [] };
      need.levels.push(c.level);
      need.items.push({ id: row.item_id, name: row.item_name, level: c.level });
      map.set(c.skill, need);
    }
  }
  return Object.fromEntries(
    Object.entries(result).map(([role, map]) => [
      role,
      [...map.values()].sort((a, b) => Math.max(...b.levels) - Math.max(...a.levels) || b.items.length - a.items.length),
    ]),
  );
}

export default function CapabilityPage() {
  const { catalog, teamView } = useStore();
  return (
    <WithRun>
      {(run) => {
        const needs = needsByRole(run);
        const groups = visibleGroups(run, catalog, teamView);
        const empty = Object.keys(needs).length === 0;
        return (
          <>
            <PageHeader
              title="Kebutuhan Capability"
              description="Skill dari katalog yang dibutuhkan pekerjaan, dan seberapa dalam. Level 1 sangat sederhana, level 5 ahli."
              actions={<TeamFilter run={run} />}
            />
            {empty ? (
              <EmptyState
                title="Belum ada data capability"
                description="Hasil ini dibuat sebelum penilaian capability tersedia. Jalankan ulang validasi untuk mengisinya."
                href="/validasi"
                action="Ke Validasi Baru"
              />
            ) : (
              <div className="space-y-10">
                {groups.flatMap((g) =>
                  g.roles
                    .filter((role) => needs[role]?.length)
                    .map((role) => {
                      const list = needs[role];
                      const top = Math.max(...list.flatMap((n) => n.levels));
                      return (
                        <section key={role} aria-labelledby={`cap-${role}`}>
                          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id={`cap-${role}`} className="flex items-center gap-2 text-base font-semibold text-ink">
                              <RoleBadge role={role} /> {roleName(role, catalog?.roles)}
                            </h2>
                            <p className="text-sm text-muted">
                              {list.length} skill, level tertinggi <span className="font-medium text-ink">{top}</span>
                            </p>
                          </div>
                          <div className="overflow-hidden rounded-xl border border-line bg-surface">
                            <table className="w-full table-fixed text-sm">
                              <colgroup>
                                <col className="w-[46%] sm:w-[44%]" />
                                <col className="w-[28%] sm:w-[20%]" />
                                <col className="hidden sm:table-column sm:w-[12%]" />
                                <col />
                              </colgroup>
                              <thead>
                                <tr className="border-b border-line text-left text-xs text-muted">
                                  <th className="px-4 py-2 font-medium">Skill</th>
                                  <th className="px-4 py-2 font-medium">Level tertinggi</th>
                                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Rata-rata</th>
                                  <th className="px-4 py-2 font-medium">Dipakai di</th>
                                </tr>
                              </thead>
                              <tbody>
                                {list.map((n) => {
                                  const avg = n.levels.reduce((a, b) => a + b, 0) / n.levels.length;
                                  return (
                                    <tr key={n.skill} className="border-b border-line align-top last:border-0">
                                      <td className="px-4 py-3">
                                        <p className="text-ink">{n.skill}</p>
                                        <p className="text-xs text-muted">{n.pillar}</p>
                                      </td>
                                      <td className="px-4 py-3">
                                        <LevelMeter level={Math.max(...n.levels)} />
                                      </td>
                                      <td className="tabular hidden px-4 py-3 text-right text-muted sm:table-cell">{num(avg, 1)}</td>
                                      <td className="px-4 py-3">
                                        <details className="group">
                                          <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap text-ink">
                                            {n.items.length} item
                                            <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-180" aria-hidden />
                                          </summary>
                                          <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
                                            {n.items.map((it) => (
                                              <li key={it.id}>
                                                <span className="tabular">{it.id}</span> {it.name}, level {it.level}
                                              </li>
                                            ))}
                                          </ul>
                                        </details>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      );
                    }),
                )}
                <details className="rounded-xl border border-line bg-surface px-5 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">Arti setiap level</summary>
                  <ol className="mt-2 space-y-1.5">
                    {Object.entries(catalog?.capability_levels ?? {}).map(([level, text]) => (
                      <li key={level} className="flex gap-3">
                        <LevelMeter level={Number(level)} />
                        <span className="text-muted">{text}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-muted">Level bisa dikoreksi per baris di Breakdown WBS, lewat panah di ujung baris.</p>
                </details>
              </div>
            )}
          </>
        );
      }}
    </WithRun>
  );
}
