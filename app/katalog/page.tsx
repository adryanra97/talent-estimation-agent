"use client";

import { RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Card, PageHeader, RoleBadge, StatusBadge } from "@/components/ui";
import { parseCatalog } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function CatalogPage() {
  const { catalog, catalogSource, setCatalog, resetCatalog, setNotice } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <>
      <PageHeader
        title="Katalog Capability"
        description="Agent menentukan role dari isi pekerjaan, berdasarkan lingkup dan pilar skill di katalog ini. Katalog yang diunggah hanya berlaku untuk tab ini."
        actions={
          <>
            <Button variant="ghost" onClick={resetCatalog} disabled={catalogSource === "bawaan"}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Pakai bawaan
            </Button>
            <Button variant="secondary" onClick={() => input.current?.click()} disabled={loading}>
              <Upload className="h-4 w-4" aria-hidden /> Unggah katalog terbaru
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
      <p className="mb-6 text-sm text-muted">
        Sumber: <span className="font-medium text-ink">{catalogSource}</span>. Format Excel memakai sheet
        <span className="font-mono"> Scope_Capability</span> (kolom Kode, Capability, In-scope, Out-of-scope, Kata kunci,
        Biasanya pendukung) dan <span className="font-mono">Pilar_Skill</span> (Kode, Pilar, Skill).
      </p>
      {!catalog ? (
        <p className="text-sm text-muted">Memuat katalog.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.values(catalog.roles).map((r) => (
              <Card key={r.code}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={r.code} />
                    <h2 className="text-base font-semibold text-ink">{r.name}</h2>
                  </div>
                  <StatusBadge tone="neutral">Tim {catalog.teams[r.team]?.label ?? r.team}</StatusBadge>
                </div>
                {r.summary && <p className="mt-3 text-sm text-ink">{r.summary}</p>}
                <dl className="mt-4 space-y-3 text-sm">
                  {Object.keys(r.capability_areas ?? {}).length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-muted uppercase">Area capability</dt>
                      <dd>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(r.capability_areas).map(([area, text]) => (
                            <li key={area}>
                              <span className="font-medium text-ink">{area}</span>
                              <span className="text-muted"> · {text}</span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-muted uppercase">Lingkup utama</dt>
                    <dd className="text-ink">{r.in_scope}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted uppercase">Di luar lingkup</dt>
                    <dd className="text-ink">{r.out_of_scope}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted uppercase">Biasanya pendukung pada</dt>
                    <dd className="text-ink">{r.usually_supporting_on}</dd>
                  </div>
                  {r.substitutes && (
                    <div>
                      <dt className="text-xs font-medium text-muted uppercase">Substitusi</dt>
                      <dd className="text-ink">{r.substitutes}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-muted uppercase">Pilar skill</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {Object.keys(r.pillars).map((p) => (
                        <span key={p} className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink ring-1 ring-line" title={r.pillars[p].join(", ")}>
                          {p}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
          {Object.keys(catalog.competency_scale ?? {}).length > 0 && (
            <Card title="Skala kompetensi" description="Acuan penilaian talent per skill">
              <ol className="grid gap-2 text-sm sm:grid-cols-5">
                {Object.entries(catalog.competency_scale).map(([level, text]) => (
                  <li key={level} className="rounded-lg bg-canvas p-3 ring-1 ring-line">
                    <p className="text-lg font-semibold text-accent-700">{level}</p>
                    <p className="text-muted">{text}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <Card title="Aturan keputusan" description="Dipatuhi Estimator dan Reviewer Agent">
            <ol className="grid gap-3 text-sm sm:grid-cols-2">
              {catalog.rules.map((rule) => (
                <li key={rule.id}>
                  <p className="font-medium text-ink">
                    <span className="text-muted">{rule.id}</span> {rule.title}
                  </p>
                  <p className="text-muted">{rule.text}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </>
  );
}
