"use client";

import { ExternalLink, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Field, RoleBadge, StatusBadge, inputBase, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { RateLevel, RateTable } from "@/lib/types";

const LEVELS: RateLevel[] = ["J", "M", "S", "L"];

/** Million rupiah with Indonesian separators, at most one decimal. */
export function jt(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function parse(text: string): number | null {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

type Draft = Record<string, Record<RateLevel, [string, string]>>;

function toDraft(rates: RateTable): Draft {
  return Object.fromEntries(
    Object.entries(rates.roles).map(([role, r]) => [
      role,
      Object.fromEntries(LEVELS.map((l) => [l, [jt(r[l][0]), jt(r[l][1])]])) as Record<RateLevel, [string, string]>,
    ]),
  );
}

/** Returns an error message for a cell, or null when the range is valid. */
function cellError(pair: [string, string]): string | null {
  const [low, high] = pair.map(parse);
  if (low === null || high === null) return "Isi angka minimum dan maksimum.";
  if (low < 0 || high < 0) return "Angka tidak boleh negatif.";
  if (low > high) return "Minimum lebih besar dari maksimum.";
  return null;
}

function sameRates(a: RateTable, b: RateTable): boolean {
  return JSON.stringify([a.roles, a.employer_multiplier, a.vendor_multiplier]) ===
    JSON.stringify([b.roles, b.employer_multiplier, b.vendor_multiplier]);
}

export function RatesEditor() {
  const { rates, defaultRates, setRates, catalog } = useStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [previous, setPrevious] = useState<RateTable | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const errors = useMemo(() => {
    if (!draft) return {};
    const out: Record<string, string> = {};
    for (const [role, levels] of Object.entries(draft)) {
      for (const l of LEVELS) {
        const e = cellError(levels[l]);
        if (e) out[`${role}.${l}`] = e;
      }
    }
    return out;
  }, [draft]);

  if (!rates || !defaultRates) {
    return <Card title="Rate talenta"><p className="text-sm text-muted">Memuat rate bawaan…</p></Card>;
  }

  const roles = Object.keys(rates.roles);
  const sample = roles.includes("DE") ? "DE" : roles[0];
  const sampleSalary = rates.roles[sample] ? (rates.roles[sample].M[0] + rates.roles[sample].M[1]) / 2 : 0;
  const isDefault = sameRates(rates, defaultRates);
  const errorCount = Object.keys(errors).length;

  function commit(next: RateTable, note: string) {
    setPrevious(rates);
    setRates(next);
    setMessage(note);
  }

  function save() {
    if (!draft || errorCount > 0 || !rates) return;
    const roles = Object.fromEntries(
      Object.entries(draft).map(([role, levels]) => [
        role,
        {
          ...rates.roles[role],
          ...Object.fromEntries(LEVELS.map((l) => [l, [parse(levels[l][0])!, parse(levels[l][1])!]])),
        },
      ]),
    ) as RateTable["roles"];
    setDraft(null);
    commit({ ...rates, roles }, "Rate tersimpan untuk sesi ini.");
  }

  function setMultiplier(key: "employer_multiplier" | "vendor_multiplier", text: string) {
    const value = parse(text);
    if (value === null || value <= 0 || !rates) return;
    setRates({ ...rates, [key]: value });
    setMessage(null);
  }

  return (
    <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
        <strong>Estimasi, bukan tarif internal.</strong> Angka bawaan adalah gaji bruto per bulan per FTE dari halaman gaji publik
        (2026). Perubahan hanya berlaku di tab ini.
      </p>

      <Card title="Pengali biaya" description="Mengubah gaji menjadi biaya. Keduanya asumsi, sesuaikan dengan kebijakan organisasi.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Biaya perusahaan (× gaji)" hint={rates.employer_note}>
            {(id) => (
              <input id={id} type="text" inputMode="decimal" className={`${inputClass} tabular`}
                key={`e-${rates.employer_multiplier}`} defaultValue={jt(rates.employer_multiplier)}
                onBlur={(e) => setMultiplier("employer_multiplier", e.target.value)} />
            )}
          </Field>
          <Field label="Vendor atau outsourcing (× gaji)" hint={rates.vendor_note}>
            {(id) => (
              <input id={id} type="text" inputMode="decimal" className={`${inputClass} tabular`}
                key={`v-${rates.vendor_multiplier}`} defaultValue={jt(rates.vendor_multiplier)}
                onBlur={(e) => setMultiplier("vendor_multiplier", e.target.value)} />
            )}
          </Field>
        </div>
        {sampleSalary > 0 && (
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted" aria-live="polite">
            Contoh: 1 FTE {catalog?.roles[sample]?.name ?? sample} Middle selama 1 bulan = gaji Rp{jt(sampleSalary)} jt, biaya
            perusahaan Rp{jt(sampleSalary * rates.employer_multiplier)} jt, vendor Rp{jt(sampleSalary * rates.vendor_multiplier)} jt.
          </p>
        )}
      </Card>

      <Card
        title="Gaji per role dan level"
        description="Rentang minimum sampai maksimum, juta rupiah per bulan per FTE. Hitungan memakai titik tengahnya."
        actions={
          draft ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>Batal</Button>
              <Button size="sm" onClick={save} disabled={errorCount > 0}>Simpan</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={isDefault}
                onClick={() => commit(defaultRates, "Rate dikembalikan ke bawaan.")}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Kembalikan bawaan
              </Button>
              <Button size="sm" onClick={() => { setDraft(toDraft(rates)); setMessage(null); }}>Ubah rate</Button>
            </div>
          )
        }
      >
        {message && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm" role="status">
            <span className="text-emerald-800">{message}</span>
            {previous && (
              <Button variant="ghost" size="sm" onClick={() => { setRates(previous); setPrevious(null); setMessage("Perubahan diurungkan."); }}>
                <Undo2 className="h-3.5 w-3.5" aria-hidden /> Urungkan
              </Button>
            )}
          </div>
        )}
        {draft && errorCount > 0 && (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {errorCount} sel belum valid. Perbaiki sel bertanda merah sebelum menyimpan.
          </p>
        )}
        {!draft && (
          <ul className="divide-y divide-line sm:hidden">
            {roles.map((role) => {
              const r = rates.roles[role];
              return (
                <li key={role} className="py-3">
                  <p className="flex items-center gap-2 text-sm">
                    <RoleBadge role={role} /><span className="text-ink">{catalog?.roles[role]?.name ?? role}</span>
                  </p>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-sm">
                    {LEVELS.map((l) => (
                      <div key={l}>
                        <dt className="text-xs text-muted">{rates.levels[l]}</dt>
                        <dd className="tabular text-ink">{jt(r[l][0])}–{jt(r[l][1])}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-muted">{r.basis}</p>
                </li>
              );
            })}
          </ul>
        )}
        <div className={`-mx-5 overflow-x-auto px-5 ${draft ? "" : "hidden sm:block"}`}>
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Rentang gaji bulanan per role dan level, juta rupiah</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="sticky left-0 bg-surface py-2 pr-3 font-medium">Role</th>
                {LEVELS.map((l) => (
                  <th key={l} scope="col" className="py-2 pr-3 font-medium">{rates.levels[l]}</th>
                ))}
                <th scope="col" className="py-2 font-medium">Dasar angka</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const r = rates.roles[role];
                const name = catalog?.roles[role]?.name ?? role;
                const derived = r.basis.toLowerCase().startsWith("turunan");
                return (
                  <tr key={role} className="border-b border-line align-top last:border-0">
                    <th scope="row" className="sticky left-0 bg-surface py-3 pr-3 text-left font-normal">
                      <span className="flex items-center gap-2"><RoleBadge role={role} /><span className="text-ink">{name}</span></span>
                    </th>
                    {LEVELS.map((l) => {
                      const changed = r[l][0] !== defaultRates.roles[role]?.[l][0] || r[l][1] !== defaultRates.roles[role]?.[l][1];
                      if (!draft) {
                        return (
                          <td key={l} className="tabular py-3 pr-3 whitespace-nowrap text-ink">
                            {jt(r[l][0])}–{jt(r[l][1])}
                            {changed && <span className="ml-1 text-xs text-accent-700" title="Berbeda dari bawaan">•</span>}
                          </td>
                        );
                      }
                      const err = errors[`${role}.${l}`];
                      const cls = `${inputBase} tabular w-16 px-2 py-1 ${err ? "border-red-400 ring-1 ring-red-200" : ""}`;
                      const update = (i: 0 | 1, v: string) =>
                        setDraft((d) => {
                          if (!d) return d;
                          const pair = [...d[role][l]] as [string, string];
                          pair[i] = v;
                          return { ...d, [role]: { ...d[role], [l]: pair } };
                        });
                      return (
                        <td key={l} className="py-2 pr-3">
                          <span className="flex items-center gap-1">
                            <input aria-label={`${name} ${rates.levels[l]} minimum`} aria-invalid={Boolean(err)} inputMode="decimal"
                              className={cls} value={draft[role][l][0]} onChange={(e) => update(0, e.target.value)} />
                            <span aria-hidden className="text-muted">–</span>
                            <input aria-label={`${name} ${rates.levels[l]} maksimum`} aria-invalid={Boolean(err)} inputMode="decimal"
                              className={cls} value={draft[role][l][1]} onChange={(e) => update(1, e.target.value)} />
                          </span>
                          {err && <span className="mt-1 block text-xs text-red-700">{err}</span>}
                        </td>
                      );
                    })}
                    <td className="py-3">
                      <StatusBadge tone={derived ? "warn" : "neutral"}>{r.basis || "Diubah pengguna"}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Tanda • berarti angka berbeda dari bawaan.</p>
      </Card>

      <details className="rounded-xl border border-line bg-surface px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium text-ink">Cara angka bawaan disusun dan sumbernya</summary>
        <p className="mt-3 leading-relaxed text-muted">{rates.method}</p>
        <ul className="mt-3 space-y-1.5">
          {rates.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
                {s.name} <ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only">(tab baru)</span>
              </a>
              <span className="text-muted">, {s.date}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
