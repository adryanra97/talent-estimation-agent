"use client";

import { ArrowRight, ArrowUpRight, CheckCircle2, Circle, FileSpreadsheet, Play, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AgentJourney from "@/components/agent-journey";
import { date, fte } from "@/lib/format";
import { useStore } from "@/lib/store";

const STEPS = [
  { title: "Berikan konteks proyek", text: "Unggah WBS Excel, dokumen permintaan, dan lampiran pendukung. Katalog capability menjadi acuan penilaian." },
  { title: "Lihat agent bekerja", text: "Intake membaca konteks; Estimator memetakan role dan capability; Reviewer memeriksa hasil, lalu Augmentation opsional menilai peluang bantuan AI." },
  { title: "Putuskan dengan bukti", text: "Bandingkan estimasi Use Case Points dan bottom-up, periksa kebutuhan FTE per bulan, lalu ekspor hasil beserta catatan review." },
];

const SAMPLE = [
  { role: "Data Engineer", requested: 1, ucp: 1.06, bottomup: .94, verdict: "Selaras", type: "good" },
  { role: "Data Scientist", requested: 1, ucp: .69, bottomup: .62, verdict: "Lebih rendah", type: "low" },
  { role: "AI Engineer", requested: .5, ucp: .71, bottomup: .78, verdict: "Lebih tinggi", type: "high" },
];

export default function HomePage() {
  const router = useRouter();
  const { apiKey, provider, run, status, start, catalogSource } = useStore();
  const ready = Boolean(apiKey);
  const reviews = run?.breakdown.filter(item => item.needs_review).length ?? 0;

  async function runDemo() {
    if (status === "running") return;
    router.push("/proses");
    await start(true);
  }

  return (
    <div className="tl-page">
      <section className="tl-home-hero" aria-labelledby="tl-hero-title">
        <div className="tl-home-intro">
          <div>
            <p className="tl-eyebrow tl-kicker">DOCUMENT TO DECISION · AGENTIC AI</p>
            <h1 id="tl-hero-title" className="tl-display">Dari WBS proyek, menjadi keputusan talent yang <em>bisa dijelaskan.</em></h1>
            <p className="tl-lead">
              TalentLens memetakan pekerjaan ke role dan capability, membandingkan
              kebutuhan FTE dengan dua metode, lalu menunjukkan keputusan mana
              yang perlu direview. Dokumen masuk, hasilnya bisa ditelusuri.
            </p>
            <div className="tl-home-actions">
              <Link href="/validasi" className="tl-button-primary">
                Mulai dengan dokumen <ArrowUpRight size={17} aria-hidden />
              </Link>
              <button type="button" onClick={runDemo} className="tl-button-secondary"
                disabled={status === "running"}>
                <Play size={15} aria-hidden /> {status === "running" ? "Sedang memproses…" : "Coba data contoh"}
              </button>
            </div>
            <div className="tl-home-chips" aria-label="Keunggulan pendekatan">
              <span><CheckCircle2 size={15} aria-hidden /> Agent bekerja berurutan</span>
              <span><CheckCircle2 size={15} aria-hidden /> UCP + Bottom-up</span>
              <span><CheckCircle2 size={15} aria-hidden /> Review manusia</span>
            </div>
          </div>
          <div>
            <AgentJourney mode="preview"/>
            <p className="tl-home-sample-caption">
              Animasi ini adalah ilustrasi alur, bukan proses server. Saat kamu menjalankan data contoh atau mengunggah WBS, status tiap agent akan mengikuti event analisis sebenarnya di halaman Proses.
            </p>
          </div>
        </div>
      </section>

      {run && (
        <aside className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-accent-200 bg-accent-50 px-5 py-4" aria-label="Hasil sebelumnya">
          <p className="text-sm text-ink">
            <strong>Hasil terakhir: {run.project.name || "proyek tanpa nama"}</strong>{" "}
            <span className="text-muted">· {date(run.project.start)} s.d. {date(run.project.end)}
              {reviews ? " · " + reviews + " baris perlu review" : ""}
            </span>
          </p>
          <Link href="/hasil/ringkasan" className="inline-flex items-center gap-2 text-sm font-semibold text-accent-700 hover:underline">
            Lihat ringkasan <ArrowRight size={15} aria-hidden/>
          </Link>
        </aside>
      )}

      <section className="tl-story-section" aria-labelledby="tl-process-title">
        <div className="tl-story-head">
          <div>
            <p className="tl-eyebrow">HOW IT WORKS</p>
            <h2 id="tl-process-title">Bukan black box. <span className="tl-serif">Setiap langkah punya peran.</span></h2>
          </div>
          <p>
            Agent menangani penilaian berbasis konteks, sedangkan perhitungan numerik
            dijalankan oleh kode. Kamu tetap memegang keputusan final melalui review.
          </p>
        </div>
        <ol className="tl-editorial-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="tl-editorial-step">
              <span aria-hidden="true">{String(i+1).padStart(2,"0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tl-evidence-section" aria-labelledby="tl-evidence-title">
        <div className="tl-evidence-layout">
          <div>
            <p className="tl-eyebrow">TWO METHODS · ONE DECISION</p>
            <h2 id="tl-evidence-title">Bukan satu angka yang harus <span className="tl-serif">dipercaya begitu saja.</span></h2>
            <p>
              Setiap role dilihat dari estimasi Use Case Points (UCP) dan bottom-up.
              Perbedaan dengan jumlah yang diminta membantu menunjukkan bagian
              mana yang perlu penjelasan lebih lanjut.
            </p>
            <div className="tl-evidence-links">
              <Link href="/metodologi">Pelajari metode <ArrowUpRight size={15} aria-hidden/></Link>
              <Link href="/katalog">Jelajahi capability <ArrowUpRight size={15} aria-hidden/></Link>
            </div>
          </div>
          <figure className="tl-example-table">
            <figcaption>Contoh fiktif · FTE yang diminta dibandingkan dengan dua estimasi. Bukan hasil analisis dokumen milik pengguna.</figcaption>
            <div className="overflow-x-auto">
              <table>
                <thead><tr>
                  <th scope="col">Role</th><th scope="col">Diminta</th><th scope="col">UCP</th><th scope="col">Bottom-up</th><th scope="col">Perbandingan</th>
                </tr></thead>
                <tbody>
                  {SAMPLE.map(row => (
                    <tr key={row.role}>
                      <td className="font-semibold">{row.role}</td>
                      <td className="tabular">{fte(row.requested)}</td>
                      <td className="tabular font-semibold">{fte(row.ucp)}</td>
                      <td className="tabular font-semibold">{fte(row.bottomup)}</td>
                      <td><span className={"tl-sample-status is-" + row.type}>{row.verdict}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
        </div>
        <div className="tl-readiness">
          <h3>Siap untuk dicoba?</h3>
          <ul className="tl-readiness-list">
            <li>
              {ready ? <CheckCircle2 size={18} color="#25856b" aria-label="Siap"/> : <Circle size={18} color="#99b3c0" aria-label="Belum"/>}
              <div><strong>Model bahasa</strong><p>{ready ? provider.model + " sudah diatur." : "Belum diatur. Data contoh tetap bisa dicoba tanpa API key."}</p><Link href="/pengaturan">{ready ? "Ubah pengaturan" : "Atur model"}</Link></div>
            </li>
            <li><CheckCircle2 size={18} color="#25856b" aria-label="Siap"/>
              <div><strong>Katalog capability</strong><p>{catalogSource === "bawaan" ? "Katalog bawaan tersedia." : "Menggunakan " + catalogSource + "."}</p><Link href="/katalog">Lihat katalog</Link></div>
            </li>
            <li><FileSpreadsheet size={18} color="#286895" aria-hidden/>
              <div><strong>WBS Excel</strong><p>Gunakan file sendiri atau unduh template data contoh.</p><a href="/api/py/demo/wbs">Unduh contoh WBS</a></div>
            </li>
          </ul>
        </div>
        <p className="tl-home-footer-note">
          <ShieldCheck size={14} aria-hidden style={{display:"inline-block",verticalAlign:"middle",marginRight:7}}/>
          File dan API key tidak disimpan di server sebagai database. Model membantu penilaian;
          kode menghitung estimasi FTE. <Link href="/metodologi" className="underline underline-offset-4">Lihat metodologi.</Link>
        </p>
      </section>
    </div>
  );
}
