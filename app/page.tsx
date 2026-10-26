"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ListChecks,
  Lock,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { date, fte } from "@/lib/format";
import { useStore } from "@/lib/store";

const STEPS = [
  {
    icon: Upload,
    title: "Unggah dokumen",
    text: "WBS dalam Excel, ditambah dokumen permintaan dan notulen bila ada.",
  },
  {
    icon: Workflow,
    title: "Agent menilai dan menghitung",
    text: "Setiap item dinilai per role, lalu dihitung dengan Use Case Points dan bottom-up.",
  },
  {
    icon: ListChecks,
    title: "Review dan unduh",
    text: "Koreksi baris yang ditandai, lalu unduh Excel dan draf pesan balasan.",
  },
];

const OUTPUTS = [
  { icon: BarChart3, title: "Ringkasan FTE", text: "Kebutuhan per role dari dua metode, dibandingkan dengan permintaan." },
  { icon: Layers, title: "Breakdown WBS", text: "Asal setiap angka: item, role, kelas, alokasi, dan alasannya." },
  { icon: Sparkles, title: "Peluang bantuan AI", text: "Tugas yang dapat dipercepat AI, per capability." },
  { icon: FileSpreadsheet, title: "Excel dengan rumus", text: "Siap dilampirkan; ubah satu input dan semua total ikut berubah." },
];

export default function HomePage() {
  const router = useRouter();
  const { apiKey, provider, run, status, start, catalogSource } = useStore();
  const ready = Boolean(apiKey);

  async function demo() {
    router.push("/proses");
    await start(true);
  }

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-line bg-surface px-6 py-10 sm:px-10">
        <p className="text-sm font-medium text-accent-700">Talent Estimation Agent</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Validasi permintaan talent dari WBS, dengan angka yang bisa ditelusuri
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Unggah WBS dan dokumen permintaan. Agent menilai setiap item, menghitung kebutuhan tiap role tim data dan tim desain dengan dua
          metode, lalu menyiapkan Excel yang siap direview.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => router.push("/validasi")} className="px-5 py-2.5">
            Mulai validasi <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" onClick={demo} disabled={status === "running"} className="px-5 py-2.5">
            <Play className="h-4 w-4" aria-hidden /> Coba demo tanpa API key
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">Demo memakai proyek fiktif dan penilai berbasis aturan. Hasilnya muncul dalam beberapa detik.</p>
      </section>

      {run && (
        <section aria-label="Hasil terakhir" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-200 bg-accent-50 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Lanjutkan hasil terakhir</p>
            <p className="text-sm text-muted">
              {run.project.name || "Proyek"} · {date(run.project.start)} s.d. {date(run.project.end)} · total bottom-up{" "}
              {fte(run.comparisons.reduce((a, c) => a + c.bu_fte, 0))} FTE
              {run.breakdown.some((r) => r.needs_review) ? ` · ${run.breakdown.filter((r) => r.needs_review).length} baris perlu review` : ""}
            </p>
          </div>
          <Link href="/hasil/ringkasan" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline">
            Buka ringkasan <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      )}

      <section aria-labelledby="cara-kerja">
        <h2 id="cara-kerja" className="mb-4 text-lg font-semibold text-ink">
          Cara kerja
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold text-muted">Langkah {i + 1}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="hasil" className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 id="hasil" className="mb-4 text-lg font-semibold text-ink">
            Yang kamu dapatkan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {OUTPUTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">Persiapan</h2>
          <ul className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
            <li className="flex items-start gap-2.5">
              {ready ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Siap" />
              ) : (
                <Settings className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="Belum" />
              )}
              <span>
                <span className="font-medium text-ink">Model bahasa</span>
                <span className="block text-muted">
                  {ready ? `${provider.model} siap dipakai.` : "Belum diatur. Demo tetap bisa dicoba."}{" "}
                  <Link href="/pengaturan" className="text-accent-700 underline">
                    {ready ? "Ubah" : "Atur sekarang"}
                  </Link>
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Siap" />
              <span>
                <span className="font-medium text-ink">Katalog capability</span>
                <span className="block text-muted">
                  Memakai katalog {catalogSource}.{" "}
                  <Link href="/katalog" className="text-accent-700 underline">
                    Lihat atau ganti
                  </Link>
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                <span className="font-medium text-ink">WBS dalam Excel</span>
                <span className="block text-muted">
                  Kolom item, tanggal mulai, dan tanggal selesai.{" "}
                  <a href="/api/py/demo/wbs" className="text-accent-700 underline">
                    Unduh contoh
                  </a>
                </span>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-label="Kepercayaan" className="grid gap-4 border-t border-line pt-8 sm:grid-cols-3">
        <div className="flex gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden />
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Tanpa penyimpanan.</span> File dan API key tidak disimpan di server; hasil hanya ada di
            tab ini.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden />
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Model menilai, kode menghitung.</span> Setiap angka berasal dari mesin hitung yang
            diuji otomatis.{" "}
            <Link href="/tentang" className="text-accent-700 underline">
              Selengkapnya
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" aria-hidden />
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Metode terbuka.</span> Use Case Points dan bottom-up dijelaskan langkah demi langkah.{" "}
            <Link href="/metodologi" className="text-accent-700 underline">
              Metodologi
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
