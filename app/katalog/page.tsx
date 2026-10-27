"use client";

import { ChevronDown, ChevronRight, Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Button, PageHeader, RoleBadge } from "@/components/ui";
import { downloadCatalogExcel, parseCatalog } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { RoleProfile } from "@/lib/types";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-1.5 text-sm font-semibold text-ink">{label}</h3>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function RoleDetail({ role }: { role: RoleProfile }) {
  return (
    <>
      <Detail label="Area capability">
        <dl className="space-y-2">
          {Object.entries(role.capability_areas ?? {}).map(([area, text]) => (
            <div key={area}>
              <dt className="font-medium text-ink">{area}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </Detail>
      <Detail label="Lingkup kerja">{role.in_scope}</Detail>
      <Detail label="Bukan pekerjaan role ini">{role.out_of_scope}</Detail>
      <Detail label="Biasanya ikut mendukung">{role.usually_supporting_on}</Detail>
      {role.substitutes && <Detail label="Bila role ini terbatas">{role.substitutes}</Detail>}
      <Detail label="Pilar skill">
        <dl className="space-y-2">
          {Object.entries(role.pillars).map(([pillar, skills]) => (
            <div key={pillar}>
              <dt className="font-medium text-ink">{pillar}</dt>
              <dd>{skills.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Detail>
      <Detail label="Kata kunci yang dikenali agent">{role.primary_keywords}</Detail>
    </>
  );
}

export default function CatalogPage() {
  const { catalog, catalogSource, setCatalog, resetCatalog, setNotice } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [openRole, setOpenRole] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      setCatalog(await parseCatalog(file), file.name);
      setNotice(`Katalog dari ${file.name} dipakai untuk sesi ini.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (input.current) input.current.value = "";
    }
  }

  const custom = catalogSource !== "bawaan";
  const selected = openRole && catalog ? catalog.roles[openRole] : null;
  const teams = catalog
    ? Object.entries(catalog.teams)
        .map(([key, t]) => ({ key, label: t.label, roles: Object.values(catalog.roles).filter((r) => r.team === key) }))
        .filter((t) => t.roles.length > 0)
    : [];

  return (
    <>
      <PageHeader
        title="Katalog Capability"
        description="Acuan agent saat menentukan role dari isi pekerjaan. Klik role untuk melihat rinciannya."
        actions={
          <>
            {custom && (
              <Button variant="ghost" onClick={resetCatalog}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Pakai bawaan
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => downloadCatalogExcel(catalog).catch((err) => setNotice(err instanceof Error ? err.message : String(err)))}
              disabled={!catalog}
            >
              <Download className="h-4 w-4" aria-hidden /> Unduh katalog
            </Button>
            <Button variant="secondary" onClick={() => input.current?.click()} disabled={loading}>
              <Upload className="h-4 w-4" aria-hidden /> Unggah katalog
            </Button>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.yaml,.yml,.json"
              className="sr-only"
              aria-label="Unggah katalog"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </>
        }
      />
      <p className="-mt-3 mb-8 text-sm text-muted">
        {custom ? (
          <>
            Memakai katalog dari <span className="font-medium text-ink">{catalogSource}</span>, hanya untuk tab ini.
          </>
        ) : (
          <>Memakai katalog bawaan. Untuk mengubahnya, unduh Excel, edit, lalu unggah kembali.</>
        )}
      </p>

      {!catalog ? (
        <p className="text-sm text-muted">Memuat katalog.</p>
      ) : (
        <div className="space-y-10">
          {teams.map((team) => (
            <section key={team.key} aria-labelledby={`tim-${team.key}`}>
              <h2 id={`tim-${team.key}`} className="mb-3 text-base font-semibold text-ink">
                Tim {team.label}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {team.roles.map((r) => (
                  <li key={r.code}>
                    <button
                      onClick={() => setOpenRole(r.code)}
                      className="group grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-2 px-4 py-4 text-left hover:bg-canvas sm:gap-x-4 sm:px-5"
                    >
                      <span className="pt-0.5 sm:w-12">
                        <RoleBadge role={r.code} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{r.name}</span>
                        <span className="mt-0.5 block text-sm text-muted">{r.summary}</span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {Object.keys(r.capability_areas ?? {}).map((area) => (
                            <span key={area} className="rounded-md bg-canvas px-2 py-0.5 text-xs text-muted ring-1 ring-line group-hover:bg-surface">
                              {area}
                            </span>
                          ))}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 text-muted group-hover:text-ink" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section aria-labelledby="aturan">
            <h2 id="aturan" className="text-base font-semibold text-ink">
              Aturan keputusan
            </h2>
            <p className="mb-3 text-sm text-muted">Dipatuhi Estimator dan Reviewer saat menilai item.</p>
            <ul className="grid gap-x-8 rounded-xl border border-line bg-surface px-5 sm:grid-cols-2">
              {catalog.rules.map((rule) => (
                <li key={rule.id} className="border-b border-line last:border-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-0">
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-start gap-2 text-sm text-ink">
                      <span className="tabular w-8 shrink-0 text-muted">{rule.id}</span>
                      <span className="flex-1 font-medium">{rule.title}</span>
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-1.5 pl-10 text-sm leading-relaxed text-muted">{rule.text}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {Object.keys(catalog.capability_levels ?? {}).length > 0 && (
            <section aria-labelledby="level">
              <h2 id="level" className="text-base font-semibold text-ink">
                Level capability
              </h2>
              <p className="mb-3 text-sm text-muted">Seberapa dalam keahlian yang dibutuhkan sebuah pekerjaan.</p>
              <ol className="rounded-xl border border-line bg-surface px-5 text-sm">
                {Object.entries(catalog.capability_levels).map(([level, text]) => {
                  const [name, ...rest] = text.split(":");
                  return (
                    <li key={level} className="flex gap-4 border-b border-line py-2.5 last:border-0">
                      <span className="tabular w-4 font-semibold text-accent-700">{level}</span>
                      <span>
                        <span className="font-medium text-ink">{name}</span>
                        {rest.length > 0 && <span className="text-muted">, {rest.join(":").trim()}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {Object.keys(catalog.competency_scale ?? {}).length > 0 && (
            <section aria-labelledby="skala">
              <h2 id="skala" className="text-base font-semibold text-ink">
                Skala kompetensi
              </h2>
              <p className="mb-3 text-sm text-muted">Acuan bila talent dinilai per skill.</p>
              <ol className="rounded-xl border border-line bg-surface px-5 text-sm">
                {Object.entries(catalog.competency_scale).map(([level, text]) => {
                  const [name, ...rest] = text.split(":");
                  return (
                    <li key={level} className="flex gap-4 border-b border-line py-2.5 last:border-0">
                      <span className="tabular w-4 font-semibold text-accent-700">{level}</span>
                      <span>
                        <span className="font-medium text-ink">{name}</span>
                        {rest.length > 0 && <span className="text-muted">, {rest.join(":").trim()}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setOpenRole(null)}
        title={
          selected && (
            <span className="flex items-center gap-2">
              <RoleBadge role={selected.code} /> {selected.name}
            </span>
          )
        }
        subtitle={selected?.summary}
      >
        {selected && <RoleDetail role={selected} />}
      </Drawer>
    </>
  );
}
