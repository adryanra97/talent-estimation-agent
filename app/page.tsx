"use client";

import { CheckCircle2, Circle, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, RoleBadge, StatusBadge } from "@/components/ui";
import { date, fte } from "@/lib/format";
import { useStore } from "@/lib/store";

const STEPS = [
  { title: "Unggah WBS", text: "Excel WBS, ditambah dokumen permintaan atau notulen bila ada." },
  { title: "Agent menilai", text: "Setiap item dicocokkan dengan capability role, lalu dihitung dengan Use Case Points dan bottom-up." },
  { title: "Review dan kirim", text: "Koreksi baris yang ditandai, unduh Excel, dan pakai draf balasan." },
];

const SAMPLE = [
  { role: "DE", name: "Data Engineer", requested: 1, ucp: 1.06, bu: 0.94, verdict: "Selaras", tone: "good" as const },
  { role: "DS", name: "Data Scientist", requested: 1, ucp: 0.69, bu: 0.62, verdict: "Lebih rendah", tone: "warn" as const },
  { role: "AI", name: "AI Engineer", requested: 0.5, ucp: 0.71, bu: 0.78, verdict: "Lebih tinggi", tone: "bad" as const },
];

export default function HomePage() {
  const router = useRouter();
  const { apiKey, provider, run, status, start, catalogSource } = useStore();
  const ready = Boolean(apiKey);
  const review = run?.breakdown.filter((r) => r.needs_review).length ?? 0;

  async function demo() {
    router.push("/proses");
    await start(true);
  }

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="max-w-xl text-3xl leading-[1.15] font-semibold text-ink sm:text-[2.5rem]">
            Cek apakah jumlah talent yang diminta sesuai dengan pekerjaannya
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            Unggah WBS proyek. Agent menilai setiap item, menghitung kebutuhan per role dengan dua metode, dan menunjukkan dari mana
            setiap angka berasal.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => router.push("/validasi")} className="px-5 py-2.5">
              Mulai validasi
            </Button>
            <Button variant="secondary" onClick={demo} disabled={status === "running"} className="px-5 py-2.5">
              <Play className="h-4 w-4" aria-hidden /> Coba dengan data contoh
            </Button>
          </div>
        </div>

        <figure className="rounded-xl border border-line bg-surface p-5">
          <figcaption className="mb-3 text-sm text-muted">Contoh hasil dari data fiktif, dalam FTE. Kesimpulan membandingkan kebutuhan hasil hitung dengan permintaan.</figcaption>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-2 font-medium">Role</th>
                <th className="py-2 pr-2 text-right font-medium">Diminta</th>
                <th className="py-2 pr-2 text-right font-medium">UCP</th>
                <th className="py-2 pr-2 text-right font-medium">Bottom-up</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Kesimpulan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((s) => (
                <tr key={s.role} className="border-b border-line last:border-0">
                  <td className="py-3 pr-2">
                    <span className="flex items-center gap-2">
                      <RoleBadge role={s.role} />
                      <span className="hidden text-ink sm:inline">{s.name}</span>
                    </span>
                  </td>
                  <td className="tabular py-3 pr-2 text-right">{fte(s.requested)}</td>
                  <td className="tabular py-3 pr-2 text-right font-semibold text-ink">{fte(s.ucp)}</td>
                  <td className="tabular py-3 pr-2 text-right font-semibold text-ink">{fte(s.bu)}</td>
                  <td className="py-3 text-right">
                    <StatusBadge tone={s.tone}>{s.verdict}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>

      {run && (
        <section aria-label="Hasil terakhir" className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-accent-50 px-5 py-4">
          <p className="text-sm text-ink">
            <span className="font-medium">Hasil terakhir: {run.project.name || "proyek tanpa nama"}</span>
            <span className="text-muted">
              , {date(run.project.start)} s.d. {date(run.project.end)}
              {review > 0 ? `, ${review} baris perlu review` : ""}.
            </span>
          </p>
          <Link href="/hasil/ringkasan" className="text-sm font-medium text-accent-700 hover:underline">
            Buka ringkasan
          </Link>
        </section>
      )}

      <section aria-labelledby="cara-kerja">
        <h2 id="cara-kerja" className="text-lg font-semibold text-ink">
          Cara kerja
        </h2>
        <ol className="mt-4 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-line pt-3">
              <p className="text-sm font-semibold text-ink">
                <span className="tabular mr-2 text-accent-700">{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="persiapan" className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="persiapan" className="text-lg font-semibold text-ink">
            Sebelum mulai
          </h2>
          <p className="mt-1 text-sm text-muted">Data contoh bisa dicoba tanpa menyiapkan apa pun.</p>
        </div>
        <ul className="divide-y divide-line text-sm">
          {[
            {
              ok: ready,
              title: "Model bahasa",
              text: ready ? `${provider.model} siap dipakai.` : "Belum diatur. Isi API key di Pengaturan.",
              href: "/pengaturan",
              link: ready ? "Ubah" : "Atur",
            },
            {
              ok: true,
              title: "Katalog capability",
              text: catalogSource === "bawaan" ? "Memakai katalog bawaan." : `Memakai ${catalogSource}.`,
              href: "/katalog",
              link: "Lihat",
            },
            {
              ok: false,
              title: "WBS dalam Excel",
              text: "Butuh kolom item, tanggal mulai, dan tanggal selesai.",
              href: "/api/py/demo/wbs",
              link: "Unduh contoh",
              external: true,
            },
          ].map((row) => (
            <li key={row.title} className="flex items-start gap-3 py-3">
              {row.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Siap" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-label="Belum" />
              )}
              <span className="flex-1">
                <span className="font-medium text-ink">{row.title}</span>
                <span className="block text-muted">{row.text}</span>
              </span>
              {row.external ? (
                <a href={row.href} className="shrink-0 text-accent-700 hover:underline">
                  {row.link}
                </a>
              ) : (
                <Link href={row.href} className="shrink-0 text-accent-700 hover:underline">
                  {row.link}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-line pt-6 text-sm text-muted">
        File dan API key tidak disimpan di server. Model hanya menilai; semua angka dihitung oleh kode yang diuji otomatis.{" "}
        <Link href="/metodologi" className="text-accent-700 hover:underline">
          Lihat metodologi
        </Link>
      </p>
    </div>
  );
}
