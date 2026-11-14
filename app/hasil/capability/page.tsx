"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Button, EmptyState, PageHeader, RoleBadge, inputClass } from "@/components/ui";
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
  const [showAll, setShowAll] = useState(false);
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
        const unique = new Set(items.flatMap((item) => item.rows.flatMap((row) => row.capabilities.map((c) => c.skill)))).size;
        const shownTotal = shown.reduce((a, i) => a + i.rows.reduce((b, row) => b + row.capabilities.length, 0), 0);
        const displayed = showAll ? shown : shown.slice(0, 20);
        return (
          <>
            <PageHeader
              title="Capability per WBS"
              description="Skill dari katalog yang dibutuhkan tiap item WBS, per role. Satu item bisa butuh beberapa capability."
              actions={<TeamFilter run={run} />}
            />
            <div className="tl-results-scope" aria-label="Cakupan kebutuhan capability">
              <div className="tl-results-scope-stat"><strong>{items.length}</strong><span>Item WBS dengan capability</span></div>
              <div className="tl-results-scope-stat"><strong>{unique}</strong><span>Skill unik teridentifikasi</span></div>
              <div className="tl-results-scope-stat"><strong>{total}</strong><span>Referensi capability pada item</span></div>
            </div>
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
                      onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
                    />
                  </div>
                  <span className="text-sm text-muted">
                    {shown.length} item, {shownTotal} capability sesuai filter.
                  </span>
                </div>
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {displayed.map((item) => (
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
                {shown.length === 0 && <p className="tl-results-empty-filter" role="status">Tidak ada item atau skill yang cocok. Coba kata kunci yang berbeda.</p>}
                {shown.length > 20 && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setShowAll(!showAll)}>
                      {showAll ? "Tampilkan 20 item pertama" : `Tampilkan semua ${shown.length} item`}
                    </Button>
                  </div>
                )}
                <p className="tl-report-footnote">Daftar lengkap tersedia di sheet Capability pada ekspor Excel. Capability yang kurang tepat dapat diperbaiki dari rincian item di <Link className="underline text-accent-700" href="/hasil/breakdown">Breakdown WBS</Link>.</p>
              </>
            )}
          </>
        );
      }}
    </WithRun>
  );
}
