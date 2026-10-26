"use client";

import { ChevronDown, Loader2, RefreshCw, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useMemo, useState } from "react";
import { WithRun, roleName } from "@/components/result-guard";
import { TeamFilter } from "@/components/team-filter";
import { Button, Card, PageHeader, RoleBadge, StatusBadge, inputBase, inputClass } from "@/components/ui";
import { date, fte, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import { visibleRoles } from "@/lib/teams";
import type { BreakdownRow, Classification, Involvement, RunResult } from "@/lib/types";

const CLASSES: Classification[] = ["Simple", "Average", "Complex"];

function Table({ run }: { run: RunResult }) {
  const params = useSearchParams();
  const { update, reclassify, busy, catalog, teamView } = useStore();
  const inView = useMemo(() => visibleRoles(run, catalog, teamView), [run, catalog, teamView]);
  const [role, setRole] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(params.get("review") === "1");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");

  const rows = useMemo(
    () =>
      run.breakdown.filter(
        (r) =>
          inView.includes(r.role) &&
          (role === "all" || r.role === role) &&
          (!reviewOnly || r.needs_review) &&
          (!query || `${r.item_id} ${r.item_name} ${r.description}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [run.breakdown, inView, role, reviewOnly, query],
  );

  const key = (r: BreakdownRow) => `${r.item_id}|${r.role}`;

  function edit(target: BreakdownRow, patch: Partial<BreakdownRow>) {
    update({
      ...run,
      approved: false,
      breakdown: run.breakdown.map((r) => (key(r) === key(target) ? { ...r, ...patch } : r)),
    });
  }

  function toggle(k: string) {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelected(next);
  }

  async function sendBack() {
    const requests = [...selected].map((k) => {
      const [item_id, r] = k.split("|");
      return { item_id, role: r, reason: comment || "Mohon dinilai ulang oleh reviewer." };
    });
    await reclassify(requests);
    setSelected(new Set());
    setComment("");
  }

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted" aria-hidden />
            <input
              aria-label="Cari item"
              className={`${inputClass} pl-9`}
              placeholder="Cari ID atau nama item"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select aria-label="Filter role" className={`${inputBase} w-auto`} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Semua role</option>
            {inView.map((r) => (
              <option key={r} value={r}>
                {roleName(r, catalog?.roles)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-accent-600" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
            Hanya perlu review
          </label>
          <span className="text-sm text-muted">{rows.length} baris</span>
          {busy && (
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Menghitung ulang
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="w-8 py-2 pr-2"><span className="sr-only">Pilih</span></th>
                <th className="py-2 pr-3 font-medium">Item WBS</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Peran</th>
                <th className="py-2 pr-3 font-medium">Klasifikasi</th>
                <th className="py-2 pr-3 text-right font-medium">Hari kerja</th>
                <th className="py-2 pr-3 text-right font-medium">Alokasi FTE</th>
                <th className="py-2 pr-3 text-right font-medium">Person-days</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="w-8 py-2"><span className="sr-only">Detail</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = key(r);
                const expanded = open === k;
                return (
                  <Fragment key={k}>
                    <tr className={`border-b border-line align-top ${r.needs_review ? "bg-amber-50/50" : ""}`}>
                      <td className="py-2.5 pr-2">
                        <input type="checkbox" aria-label={`Pilih ${r.item_id} ${r.role}`} className="h-4 w-4 accent-accent-600" checked={selected.has(k)} onChange={() => toggle(k)} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-ink">
                          <span className="tabular text-muted">{r.item_id}</span> {r.item_name}
                        </p>
                        <p className="text-xs text-muted">
                          {date(r.start)} s.d. {date(r.end)}
                          {r.source === "additional" && " · di luar WBS"}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3"><RoleBadge role={r.role} /></td>
                      <td className="py-2.5 pr-3">
                        <select aria-label="Peran" className="rounded-md border border-line bg-white px-2 py-1 text-sm" value={r.involvement} onChange={(e) => edit(r, { involvement: e.target.value as Involvement })}>
                          <option>Utama</option>
                          <option>Pendukung</option>
                        </select>
                      </td>
                      <td className="py-2.5 pr-3">
                        <select aria-label="Klasifikasi" className="rounded-md border border-line bg-white px-2 py-1 text-sm" value={r.classification} onChange={(e) => edit(r, { classification: e.target.value as Classification })}>
                          {CLASSES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="tabular py-2.5 pr-3 text-right">{num(r.workdays)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <input
                          aria-label="Alokasi FTE"
                          type="number"
                          step={0.05}
                          min={0}
                          max={5}
                          className="tabular w-20 rounded-md border border-line bg-white px-2 py-1 text-right text-sm"
                          defaultValue={r.allocation_fte}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== r.allocation_fte && v >= 0 && v <= 5) edit(r, { allocation_fte: v });
                          }}
                        />
                      </td>
                      <td className="tabular py-2.5 pr-3 text-right">{fte((r.workdays ?? 0) * r.allocation_fte * r.quantity, 1)}</td>
                      <td className="py-2.5 pr-3">
                        <button onClick={() => edit(r, { needs_review: !r.needs_review })} title="Ubah status review">
                          {r.needs_review ? <StatusBadge tone="warn">Perlu review</StatusBadge> : <StatusBadge tone="neutral">OK</StatusBadge>}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => setOpen(expanded ? null : k)} aria-expanded={expanded} aria-label="Lihat alasan" className="text-muted hover:text-ink">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-line bg-canvas">
                        <td />
                        <td colSpan={9} className="py-3 pr-3 text-sm">
                          <p className="text-muted">{r.description || "Tanpa deskripsi"}</p>
                          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-medium text-muted uppercase">Alasan klasifikasi dan peran</dt>
                              <dd className="text-ink">{r.classification_reason || "-"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted uppercase">Alasan alokasi</dt>
                              <dd className="text-ink">{r.allocation_reason || "-"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted uppercase">Role di WBS</dt>
                              <dd className="text-ink">{r.role_hint || "-"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted uppercase">Jumlah langkah · Qty</dt>
                              <dd className="text-ink">{r.steps ?? "-"} · {r.quantity}</dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent-200 bg-white p-4 shadow-lg">
          <span className="text-sm font-medium text-ink">{selected.size} baris dipilih</span>
          <input
            aria-label="Catatan untuk agent"
            className={`${inputClass} min-w-64 flex-1`}
            placeholder="Catatan untuk agent, misalnya: item ini hanya integrasi satu sumber"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={sendBack} disabled={busy}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Nilai ulang dengan agent
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Batal
          </Button>
        </div>
      )}
    </>
  );
}

export default function BreakdownPage() {
  return (
    <WithRun>
      {(run) => (
        <>
          <PageHeader
            title="Breakdown WBS"
            description="Satu baris = satu item WBS untuk satu role. Ubah peran, klasifikasi, atau alokasi; semua total dihitung ulang tanpa memanggil model. Pilih baris untuk dinilai ulang oleh agent."
            actions={<TeamFilter run={run} />}
          />
          <Suspense>
            <Table run={run} />
          </Suspense>
        </>
      )}
    </WithRun>
  );
}
