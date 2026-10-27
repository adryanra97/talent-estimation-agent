"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { EmptyState, PageHeader, RoleBadge, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import { visibleRoles } from "@/lib/teams";
import type { BreakdownRow } from "@/lib/types";

interface ItemCapabilities {
  id: string;
  name: string;
  group: string;
  rows: BreakdownRow[];
}

export default function CapabilityPage() {
  const { catalog, teamView } = useStore();
  const [query, setQuery] = useState("");
  return (
    <WithRun>
      {(run) => {
        const inView = new Set(visibleRoles(run, catalog, teamView));
        const items: ItemCapabilities[] = [];
        for (const row of run.breakdown) {
          if (!inView.has(row.role) || !(row.capabilities ?? []).length) continue;
          let item = items.find((i) => i.id === row.item_id);
          if (!item) {
            item = { id: row.item_id, name: row.item_name, group: row.group, rows: [] };
            items.push(item);
          }
          item.rows.push(row);
        }
        const q = query.trim().toLowerCase();
        const shown = q
          ? items.filter((i) =>
              `${i.id} ${i.name} ${i.rows.flatMap((r) => r.capabilities.map((c) => c.skill)).join(" ")}`.toLowerCase().includes(q),
            )
          : items;
        const total = items.reduce((a, i) => a + i.rows.reduce((b, r) => b + r.capabilities.length, 0), 0);
        return (
          <>
            <PageHeader
              title="Capability per WBS"
              description="Skill dari katalog yang dibutuhkan tiap item WBS, per role. Satu item bisa butuh beberapa capability."
              actions={<TeamFilter run={run} />}
            />
            {items.length === 0 ? (
              <EmptyState
                title="Belum ada data capability"
                description="Hasil ini dibuat sebelum penilaian capability tersedia. Jalankan ulang validasi untuk mengisinya."
                href="/validasi"
                action="Ke Validasi Baru"
              />
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="relative min-w-60 flex-1">
                    <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted" aria-hidden />
                    <input
                      aria-label="Cari item atau skill"
                      className={`${inputClass} pl-9`}
                      placeholder="Cari item atau skill"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <span className="text-sm text-muted">
                    {shown.length} item, {total} capability. Daftar lengkap ada di sheet Capability pada Excel.
                  </span>
                </div>
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {shown.map((item) => (
                    <li key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          <span className="tabular mr-1.5 text-muted">{item.id}</span>
                          {item.name}
                        </p>
                        {item.group && <p className="text-xs text-muted">{item.group}</p>}
                      </div>
                      <div className="space-y-2">
                        {item.rows.map((row) => (
                          <div key={row.role} className="flex flex-wrap items-start gap-2">
                            <span className="pt-0.5" title={roleName(row.role, catalog?.roles)}>
                              <RoleBadge role={row.role} />
                            </span>
                            <ul className="flex flex-1 flex-wrap gap-1.5" aria-label={`Capability ${roleName(row.role, catalog?.roles)}`}>
                              {row.capabilities.map((c) => (
                                <li
                                  key={c.skill}
                                  title={[c.pillar, c.reason].filter(Boolean).join(". ")}
                                  className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink ring-1 ring-line"
                                >
                                  {c.skill}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted">Capability yang kurang tepat bisa dihapus dari rincian baris di Breakdown WBS.</p>
              </>
            )}
          </>
        );
      }}
    </WithRun>
  );
}
