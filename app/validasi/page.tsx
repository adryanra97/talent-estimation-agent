"use client";

import { AlertCircle, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, Loader2, Plus, RotateCcw, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button, Card, Field, InfoTip, PageHeader, Toggle, inputBase, inputClass } from "@/components/ui";
import { previewWbs } from "@/lib/api";
import { date as fmtDate } from "@/lib/format";
import { DEFAULT_PARAMETERS, MAX_FILES_PER_FIELD, MAX_TOTAL_BYTES, type TeamInput, useStore } from "@/lib/store";
import type { Parameters, Scope } from "@/lib/types";

function size(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

function FilePicker({
  label,
  hint,
  accept,
  files,
  onChange,
  required,
  status,
  fileStatus,
}: {
  label: string;
  hint: string;
  accept: string;
  files: File[];
  onChange: (f: File[]) => void;
  required?: boolean;
  status?: React.ReactNode;
  fileStatus?: (file: File, index: number) => React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const Icon = accept.includes("xlsx") ? FileSpreadsheet : FileText;
  const extensions = accept.split(",").map((e) => e.trim().toLowerCase());
  const full = files.length >= MAX_FILES_PER_FIELD;

  function add(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const wrongType = incoming.filter((f) => !extensions.some((ext) => f.name.toLowerCase().endsWith(ext)));
    const fresh = incoming.filter((f) => !wrongType.includes(f) && !files.some((g) => sameFile(f, g)));
    const room = MAX_FILES_PER_FIELD - files.length;
    const notes = [];
    if (wrongType.length) notes.push(`${wrongType.map((f) => f.name).join(", ")} bukan ${accept.replaceAll(",", ", ")}`);
    if (fresh.length > room) notes.push(`maksimal ${MAX_FILES_PER_FIELD} file, ${fresh.length - room} file tidak ditambahkan`);
    setRejected(notes.length ? `${notes.join("; ")}.` : null);
    if (fresh.length && room > 0) onChange([...files, ...fresh.slice(0, room)]);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">
          {label} {required ? <span className="text-red-700">*</span> : <span className="font-normal text-muted">(opsional)</span>}
        </p>
        {files.length > 0 && (
          <span className="tabular text-xs text-muted">
            {files.length}/{MAX_FILES_PER_FIELD} file
          </span>
        )}
      </div>
      {files.length > 0 && (
        <ul className="mb-2 divide-y divide-line rounded-lg border border-line bg-surface">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 px-4 py-2.5">
              <Icon className="h-5 w-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {file.name} <span className="tabular font-normal text-muted">({size(file.size)})</span>
                </p>
                {fileStatus?.(file, index)}
              </div>
              <Button size="sm" variant="ghost" aria-label={`Hapus ${file.name}`} onClick={() => onChange(files.filter((_, i) => i !== index))}>
                <X className="h-4 w-4" aria-hidden /> Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            add(e.dataTransfer.files);
          }}
          className={`flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
            dragging ? "border-accent-500 bg-accent-50" : "border-line bg-canvas"
          }`}
        >
          <Upload className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted">{files.length ? "Tambah file lain: seret ke sini atau pilih" : hint}</p>
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
            {files.length ? <Plus className="h-4 w-4" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            {files.length ? "Tambah file" : "Pilih file"}
          </Button>
          <input
            ref={input}
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            aria-label={label}
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {rejected && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {rejected}
        </p>
      )}
      {status}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      className={`${inputClass} tabular`}
      value={Number.isFinite(value) ? value : ""}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

const PARAM_FIELDS: {
  key: keyof Parameters;
  label: string;
  tip: string;
  min: number;
  max: number;
  step: number;
  pct?: boolean;
}[] = [
  { key: "phm", label: "Pengali jam per poin UCP (PHM)", tip: "Jam kerja per 1 poin UCP. Literatur memakai 15-20 untuk use case software; item WBS lebih kecil sehingga nilai bawaan 9 (kalibrasi awal).", min: 5, max: 30, step: 0.5 },
  { key: "hours_per_day", label: "Jam kerja per hari", tip: "Jam efektif dalam satu person-day.", min: 4, max: 12, step: 0.5 },
  { key: "days_per_month", label: "Hari kerja per bulan", tip: "Hari kerja efektif dalam satu person-month.", min: 15, max: 23, step: 1 },
  { key: "tolerance", label: "Toleransi selaras (%)", tip: "Selisih maksimum terhadap permintaan agar dianggap selaras.", min: 0, max: 0.5, step: 0.05, pct: true },
  { key: "support_factor", label: "Bobot peran pendukung", tip: "Porsi bobot UCP yang dihitung ketika role hanya mendukung sebuah item.", min: 0, max: 1, step: 0.05 },
];

export default function NewValidationPage() {
  const router = useRouter();
  const store = useStore();
  const {
    catalog, project, setProject, parameters, setParameters, team, setTeam, aiEnabled, setAiEnabled,
    aiTools, setAiTools, files, setFiles, preview, setPreview, apiKey, start, status, setCatalog, catalogSource,
  } = store;
  const [checking, setChecking] = useState(false);
  const [wbsError, setWbsError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [holiday, setHoliday] = useState("");

  const roles = useMemo(() => {
    if (!catalog) return [];
    return Object.values(catalog.roles).filter((r) => project.scope === "all" || r.team === project.scope);
  }, [catalog, project.scope]);

  const changed = useMemo(() => {
    let count = 0;
    for (const f of PARAM_FIELDS) if (parameters[f.key] !== DEFAULT_PARAMETERS[f.key]) count++;
    if (parameters.holidays.length) count++;
    for (const t of Object.values(team)) if (t.requested || t.existing || t.reference) count++;
    if (aiTools.trim()) count++;
    if (catalogSource !== "bawaan") count++;
    return count;
  }, [aiTools, catalogSource, parameters, team]);

  const periodError =
    project.start && project.end && project.start > project.end ? "Tanggal selesai harus setelah tanggal mulai." : null;
  const paramErrors = PARAM_FIELDS.filter((f) => {
    const v = parameters[f.key] as number;
    return !(v >= f.min && v <= f.max);
  }).map((f) => f.label);

  const totalBytes = [...files.wbs, ...files.request, ...files.supporting].reduce((a, f) => a + f.size, 0);
  const tooLarge = totalBytes > MAX_TOTAL_BYTES;
  const ready = Boolean(files.wbs.length && preview && !wbsError && !periodError && !tooLarge && paramErrors.length === 0);
  const canRun = ready && Boolean(apiKey);

  async function chooseWbs(list: File[]) {
    setFiles({ ...files, wbs: list });
    setPreview(null);
    setWbsError(null);
    if (!list.length) return;
    setChecking(true);
    try {
      const result = await previewWbs(list);
      setPreview(result);
      setProject({ ...project, start: result.start, end: result.end });
    } catch (err) {
      setWbsError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  function updateTeam(role: string, key: keyof TeamInput, value: string) {
    const current = team[role] ?? { requested: "", existing: "", reference: "" };
    setTeam({ ...team, [role]: { ...current, [key]: value } });
  }

  function resetAdvanced() {
    setParameters(DEFAULT_PARAMETERS);
    setTeam({});
    setAiTools("");
    store.resetCatalog();
  }

  async function run(demo: boolean) {
    router.push("/proses");
    await start(demo);
  }

  const scopes: { value: Scope; label: string; disabled?: boolean }[] = [
    { value: "data", label: "Data" },
    { value: "design", label: "Design", disabled: !catalog || (catalog.teams.design?.roles ?? []).length === 0 },
    { value: "all", label: "Semua" },
  ];

  return (
    <>
      <PageHeader
        title="Validasi Baru"
        description="Hanya WBS yang wajib. File diproses di memori dan tidak disimpan."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Dokumen">
            <div className="space-y-4">
              <FilePicker
                label="WBS"
                hint="Seret file .xlsx ke sini. Boleh lebih dari satu."
                accept=".xlsx"
                required
                files={files.wbs}
                onChange={chooseWbs}
                fileStatus={(file) => {
                  const info = preview?.files.find((f) => f.name === file.name);
                  return info ? (
                    <p className="text-xs text-muted">
                      {info.items} item di sheet &quot;{info.sheet}&quot;, {fmtDate(info.start)} s.d. {fmtDate(info.end)}
                    </p>
                  ) : null;
                }}
                status={
                  checking ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Membaca struktur WBS
                    </p>
                  ) : wbsError ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {wbsError}
                    </p>
                  ) : preview ? (
                    <div className="mt-1.5 space-y-1 text-xs">
                      <p className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {files.wbs.length > 1 ? `Total ${preview.items} item dari ${files.wbs.length} file` : `${preview.items} item level terbawah`},{" "}
                        {fmtDate(preview.start)} s.d. {fmtDate(preview.end)}
                      </p>
                      {preview.warnings.slice(0, 3).map((w) => (
                        <p key={w} className="flex items-start gap-1.5 text-amber-800">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
              <FilePicker
                label="Dokumen permintaan"
                hint="PDF, Word, atau teks yang menyebut jumlah talent."
                accept=".pdf,.docx,.txt,.md"
                files={files.request}
                onChange={(f) => setFiles({ ...files, request: f })}
              />
              <FilePicker
                label="Dokumen pendukung"
                hint="Misalnya notulen yang menyebut pekerjaan tambahan."
                accept=".pdf,.docx,.txt,.md"
                files={files.supporting}
                onChange={(f) => setFiles({ ...files, supporting: f })}
              />
              {totalBytes > 0 && (
                <p className={`tabular text-xs ${tooLarge ? "text-red-700" : "text-muted"}`}>
                  Total unggahan {size(totalBytes)} dari batas 4 MB
                  {tooLarge ? ". Kurangi file atau kecilkan ukurannya sebelum menjalankan." : "."}
                </p>
              )}
            </div>
          </Card>

          <Card title="Proyek">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nama proyek" hint="Dibaca dari dokumen bila dikosongkan">
                  {(id) => (
                    <input id={id} className={inputClass} value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} />
                  )}
                </Field>
              </div>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
                  Cakupan role <InfoTip text="Hanya role dalam cakupan yang dinilai dan dihitung. Role Design akan tersedia setelah katalognya dilengkapi." />
                </legend>
                <div className="inline-flex rounded-lg border border-line bg-canvas p-1">
                  {scopes.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      disabled={s.disabled}
                      onClick={() => setProject({ ...project, scope: s.value })}
                      aria-pressed={project.scope === s.value}
                      className={`rounded-md px-4 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-400 ${
                        project.scope === s.value ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted hover:text-ink"
                      }`}
                    >
                      {s.label}
                      {s.disabled && <span className="ml-1 text-xs">(segera)</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {roles.map((r) => r.name).join(", ") || "Memuat katalog"}
                </p>
              </fieldset>
              <Field label="Tanggal mulai" hint="Terisi dari WBS; ubah bila proyek berjalan di periode lain" error={null}>
                {(id) => (
                  <input id={id} type="date" className={inputClass} value={project.start ?? ""} onChange={(e) => setProject({ ...project, start: e.target.value || null })} />
                )}
              </Field>
              <Field label="Tanggal selesai" hint="Item di luar periode tidak tampil di sebaran bulanan" error={periodError}>
                {(id) => (
                  <input id={id} type="date" className={inputClass} value={project.end ?? ""} onChange={(e) => setProject({ ...project, end: e.target.value || null })} />
                )}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Konteks tambahan" hint="Contoh: proyek sebenarnya hanya Oktober sampai November; data bersifat sensitif.">
                  {(id) => (
                    <textarea id={id} rows={3} className={inputClass} value={project.context} onChange={(e) => setProject({ ...project, context: e.target.value })} />
                  )}
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  checked={aiEnabled}
                  onChange={setAiEnabled}
                  label="Analisis peluang bantuan AI"
                  description="Skenario terpisah: tugas mana yang bisa lebih cepat dengan bantuan AI."
                />
              </div>
            </div>
          </Card>

          <section className="rounded-xl border border-line bg-surface">
            <button
              type="button"
              onClick={() => setAdvanced(!advanced)}
              aria-expanded={advanced}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span>
                <span className="block text-base font-semibold text-ink">Pengaturan lanjutan</span>
                <span className="block text-sm text-muted">Parameter hitung, kondisi tim, dan bantuan AI. Nilai bawaan sudah siap dipakai.</span>
              </span>
              <span className="flex items-center gap-3">
                {changed > 0 && (
                  <span className="rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 ring-1 ring-accent-200">
                    {changed} nilai diubah
                  </span>
                )}
                <ChevronDown className={`h-5 w-5 text-muted transition-transform ${advanced ? "rotate-180" : ""}`} aria-hidden />
              </span>
            </button>
            {advanced && (
              <div className="space-y-8 border-t border-line px-5 py-5">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-ink">Parameter perhitungan</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {PARAM_FIELDS.map((f) => {
                      const value = parameters[f.key] as number;
                      const invalid = !(value >= f.min && value <= f.max);
                      return (
                        <Field
                          key={f.key}
                          label={f.label}
                          tip={f.tip}
                          hint={`Bawaan ${f.pct ? `${(DEFAULT_PARAMETERS[f.key] as number) * 100}%` : DEFAULT_PARAMETERS[f.key]}`}
                          error={invalid ? (f.pct ? `Isi antara ${f.min * 100} dan ${f.max * 100}.` : `Isi antara ${f.min} dan ${f.max}.`) : null}
                        >
                          {(id) =>
                            f.pct ? (
                              <NumberInput id={id} value={Math.round(value * 100)} step={5} min={f.min * 100} max={f.max * 100} onChange={(v) => setParameters({ ...parameters, [f.key]: v / 100 })} />
                            ) : (
                              <NumberInput id={id} value={value} step={f.step} min={f.min} max={f.max} onChange={(v) => setParameters({ ...parameters, [f.key]: v })} />
                            )
                          }
                        </Field>
                      );
                    })}
                    <Field label="Hari libur dalam periode" hint="Dikeluarkan dari hitungan hari kerja">
                      {(id) => (
                        <div className="flex flex-wrap gap-2">
                          <input id={id} type="date" className={`${inputBase} min-w-0 flex-1`} value={holiday} onChange={(e) => setHoliday(e.target.value)} />
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!holiday}
                            onClick={() => {
                              setParameters({ ...parameters, holidays: [...new Set([...parameters.holidays, holiday])].sort() });
                              setHoliday("");
                            }}
                          >
                            Tambah
                          </Button>
                        </div>
                      )}
                    </Field>
                  </div>
                  {parameters.holidays.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parameters.holidays.map((h) => (
                        <button
                          key={h}
                          onClick={() => setParameters({ ...parameters, holidays: parameters.holidays.filter((x) => x !== h) })}
                          className="rounded-md bg-canvas px-2 py-1 text-xs text-ink ring-1 ring-line hover:bg-red-50"
                          aria-label={`Hapus libur ${fmtDate(h)}`}
                        >
                          {fmtDate(h)} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    Kondisi tim per role
                    <InfoTip text="Talent existing mengurangi kebutuhan total menjadi kebutuhan tambahan, yang dibandingkan dengan permintaan. FTE diminta yang diisi di sini menimpa hasil baca dokumen." />
                  </h3>
                  <p className="mb-3 text-xs text-muted">Kosongkan bila tidak ada. Talent existing bawaan 0.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted">
                          <th className="py-2 pr-4 font-medium">Role</th>
                          <th className="py-2 pr-4 font-medium">Talent existing (FTE)</th>
                          <th className="py-2 pr-4 font-medium">FTE diminta (timpa)</th>
                          <th className="py-2 font-medium">Usulan pembanding (FTE)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((r) => (
                          <tr key={r.code} className="border-t border-line">
                            <td className="py-2 pr-4 font-medium text-ink">{r.name}</td>
                            {(["existing", "requested", "reference"] as const).map((k) => (
                              <td key={k} className="py-2 pr-4">
                                <input
                                  aria-label={`${k} ${r.name}`}
                                  inputMode="decimal"
                                  className={`${inputClass} tabular max-w-32`}
                                  placeholder={k === "existing" ? "0" : "-"}
                                  value={team[r.code]?.[k] ?? ""}
                                  onChange={(e) => updateTeam(r.code, k, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {aiEnabled && catalog && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-ink">Bantuan AI</h3>
                    <p className="mb-3 text-xs text-muted">Persentase hemat bawaan per kategori. Angka ini asumsi konservatif dan perlu dikalibrasi.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {catalog.ai_categories.map((c, i) => (
                        <div key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                          <span className="text-sm text-ink">
                            {c.label}
                            <span className="block text-xs text-muted">
                              Rentang {Math.round(c.min_saving * 100)}-{Math.round(c.max_saving * 100)}%
                            </span>
                          </span>
                          <input
                            aria-label={`Hemat bawaan ${c.label}`}
                            type="number"
                            min={Math.round(c.min_saving * 100)}
                            max={Math.round(c.max_saving * 100)}
                            className={`${inputClass} tabular w-20`}
                            value={Math.round(c.default_saving * 100)}
                            onChange={(e) => {
                              const v = Math.min(c.max_saving, Math.max(c.min_saving, Number(e.target.value) / 100));
                              const next = { ...catalog, ai_categories: catalog.ai_categories.map((x, j) => (j === i ? { ...x, default_saving: v } : x)) };
                              setCatalog(next, catalogSource === "bawaan" ? "bawaan (disesuaikan)" : catalogSource);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 max-w-md">
                      <Field label="Tool AI yang diizinkan" hint="Pisahkan dengan koma. Muncul sebagai prasyarat pada rekomendasi.">
                        {(id) => <input id={id} className={inputClass} placeholder="Contoh: code assistant internal, model sovereign" value={aiTools} onChange={(e) => setAiTools(e.target.value)} />}
                      </Field>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-xs text-muted">
                    Katalog capability: <span className="font-medium text-ink">{catalogSource}</span>.{" "}
                    <Link href="/katalog" className="text-accent-700 underline">Ganti katalog</Link>
                  </p>
                  <Button variant="ghost" size="sm" onClick={resetAdvanced} disabled={changed === 0}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Kembalikan ke default
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-20 space-y-4">
            <Card title="Siap dijalankan?">
              <ul className="space-y-2.5 text-sm">
                {[
                  { ok: Boolean(preview && !wbsError), text: "WBS terbaca" },
                  { ok: !tooLarge, text: "Total file di bawah 4 MB" },
                  { ok: !periodError && Boolean(project.start && project.end), text: "Periode proyek valid" },
                  { ok: paramErrors.length === 0, text: "Parameter dalam batas wajar" },
                  { ok: Boolean(apiKey), text: "Model dan API key siap", link: "/pengaturan" },
                ].map((c) => (
                  <li key={c.text} className="flex items-center gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Terpenuhi" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-slate-400" aria-label="Belum" />
                    )}
                    <span className={c.ok ? "text-ink" : "text-muted"}>
                      {c.text}
                      {!c.ok && c.link && (
                        <Link href={c.link} className="ml-1 text-accent-700 underline">
                          atur
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 space-y-2">
                <Button className="w-full" disabled={!canRun || status === "running"} onClick={() => run(false)}>
                  Jalankan validasi
                </Button>
                <Button variant="secondary" className="w-full" disabled={status === "running"} onClick={() => run(true)}>
                  Coba dengan data contoh
                </Button>
                <p className="text-xs text-muted">Data contoh tidak butuh API key.</p>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </>
  );
}
