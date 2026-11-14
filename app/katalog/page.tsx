"use client";

import { ChevronDown, ChevronRight, Download, RotateCcw, Search, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Button, RoleBadge } from "@/components/ui";
import { ResourceHero, ResourceHeading } from "@/components/resource-page";
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
  const [query, setQuery] = useState("");
  const [teamScope, setTeamScope] = useState("all");

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

  const roleCount = teams.reduce((sum, team) => sum + team.roles.length, 0);
  const skillCount = catalog
    ? new Set(Object.values(catalog.roles).flatMap((role) => Object.values(role.pillars ?? {}).flat())).size
    : 0;
  const filterQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredTeams = teams
    .filter((team) => teamScope === "all" || team.key === teamScope)
    .map((team) => ({
      ...team,
      roles: team.roles.filter((role) => !filterQuery || [
        role.code, role.name, role.summary, role.in_scope,
        ...Object.keys(role.capability_areas ?? {}),
        ...Object.values(role.pillars ?? {}).flat(),
      ].join(" ").toLocaleLowerCase("id-ID").includes(filterQuery)),
    }))
    .filter((team) => team.roles.length > 0);
  const filteredCount = filteredTeams.reduce((sum, team) => sum + team.roles.length, 0);

  return (
    <div className="tl-resource-page">
      <ResourceHero
        eyebrow="ROLE & SKILL REFERENCE"
        title="Katalog"
        accent="capability."
        description="Eksplorasi role, pilar skill, lingkup pekerjaan, dan aturan keputusan yang menjadi acuan agent saat menganalisis WBS."
        chapter="REFERENCE / 01"
        actions={
          <>
            {custom && (
              <Button variant="secondary" onClick={resetCatalog}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Pakai bawaan
              </Button>
            )}
            <Button variant="secondary" onClick={() => void downloadCatalogExcel(catalog).catch((err) => setNotice(err instanceof Error ? err.message : String(err)))} disabled={!catalog}>
              <Download className="h-4 w-4" aria-hidden /> Unduh Excel
            </Button>
            <Button variant="secondary" onClick={() => input.current?.click()} disabled={loading}>
              <Upload className="h-4 w-4" aria-hidden /> {loading ? "Mengunggah…" : "Unggah katalog"}
            </Button>
            <input ref={input} type="file" accept=".xlsx,.yaml,.yml,.json" className="sr-only"
              aria-label="Unggah katalog" onChange={(e) => void upload(e.target.files?.[0])} />
          </>
        }
      />
      <div className="tl-resource-body">
        <div className="tl-resource-notice" role="status">
          <span aria-hidden="true">◈</span>
          <span>{custom ? <>Menggunakan katalog <strong>{catalogSource}</strong> hanya selama tab ini aktif.</> :
            "Menggunakan katalog bawaan. Untuk menyesuaikan, unduh Excel, edit, lalu unggah file yang diperbarui."}</span>
        </div>
      {!catalog ? (
        <div className="tl-resource-empty" role="status">Katalog belum tersedia. Periksa koneksi API, kemudian coba buka halaman ini kembali.</div>
      ) : (
        <>
          <dl className="tl-resource-kpi-strip" aria-label="Cakupan katalog">
            <div className="tl-resource-kpi"><dt>Role terdokumentasi</dt><dd>{roleCount}</dd><small>Role dalam tim yang tersedia</small></div>
            <div className="tl-resource-kpi"><dt>Skill unik</dt><dd>{skillCount}</dd><small>Dari pilar kompetensi</small></div>
            <div className="tl-resource-kpi"><dt>Aturan keputusan</dt><dd>{catalog.rules.length}</dd><small>Acuan klasifikasi dan review</small></div>
          </dl>
          <section aria-labelledby="catalog-roles">
            <ResourceHeading index="01" label="ROLE DIRECTORY" title="Cari role dan capability"
              id="catalog-roles" description="Telusuri role berdasarkan nama, skill, atau cakupan kerja. Pilih role untuk membaca penjelasan lengkap." />
            <div className="tl-resource-toolbar">
              <label className="tl-search">
                <span className="sr-only">Cari role, area capability, atau skill</span>
                <Search size={17} aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari role, skill, atau area…" />
              </label>
              <label>
                <span className="sr-only">Filter tim</span>
                <select value={teamScope} onChange={(e) => setTeamScope(e.target.value)}>
                  <option value="all">Semua tim</option>
                  {teams.map((team) => <option value={team.key} key={team.key}>{team.label}</option>)}
                </select>
              </label>
              <span className="tl-resource-count" role="status">{filteredCount} dari {roleCount} role</span>
              {(query || teamScope !== "all") && (
                <button type="button" className="tl-resource-clear" onClick={() => { setQuery(""); setTeamScope("all"); }}>Hapus filter</button>
              )}
            </div>
            {filteredCount === 0 && (
              <div className="tl-resource-empty" role="status">
                Tidak ada role yang cocok. Ubah kata kunci atau pilih semua tim untuk melihat katalog.
              </div>
            )}
            <div className="tl-catalog-directory">
          {filteredTeams.map((team) => (
            <section key={team.key} className="tl-catalog-team" aria-labelledby={`tim-${team.key}`}>
              <div className="tl-catalog-team-header"><h3 id={`tim-${team.key}`}>Tim {team.label}</h3><span>{team.roles.length} role</span></div>
              <ul className="tl-catalog-role-list">
                {team.roles.map((r) => (
                  <li key={r.code}>
                    <button
                      onClick={() => setOpenRole(r.code)}
                      className="tl-catalog-role group"
                    >
                      <span className="tl-catalog-role-code">
                        <RoleBadge role={r.code} />
                      </span>
                      <span className="min-w-0">
                        <span className="tl-catalog-role-name">{r.name}</span>
                        <span className="tl-catalog-role-summary">{r.summary}</span>
                        <span className="tl-catalog-role-tags">
                          {Object.keys(r.capability_areas ?? {}).map((area) => (
                            <span key={area} >
                              {area}
                            </span>
                          ))}
                        </span>
                      </span>
                      <ChevronRight className="tl-catalog-role-arrow h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

            </div>
          </section>

          <section aria-labelledby="aturan">
            <ResourceHeading index="02" label="GOVERNANCE" id="aturan" title="Aturan keputusan"
              description="Aturan yang digunakan Estimator dan Reviewer dalam mengklasifikasi pekerjaan. Buka setiap aturan untuk detailnya." />
            <ul className="tl-catalog-reference">
              {catalog.rules.map((rule) => (
                <li key={rule.id} >
                  <details className="tl-catalog-rule group">
                    <summary >
                      <span className="tl-rule-id">{rule.id}</span>
                      <span >{rule.title}</span>
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </summary>
                    <p >{rule.text}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {Object.keys(catalog.competency_scale ?? {}).length > 0 && (
            <section aria-labelledby="skala">
              <ResourceHeading index="03" label="COMPETENCY SCALE" id="skala" title="Skala kompetensi"
                description="Referensi tingkat kompetensi untuk penilaian talent per skill." />
              <ol className="tl-catalog-scale">
                {Object.entries(catalog.competency_scale).map(([level, text]) => {
                  const [name, ...rest] = text.split(":");
                  return (
                    <li key={level} >
                      <span >{level}</span>
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
        </>
      )}
      </div>

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
    </div>
  );
}
