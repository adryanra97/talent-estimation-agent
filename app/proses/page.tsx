"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AgentJourney, { AGENT_STEPS } from "@/components/agent-journey";
import { Button, Card, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";

function Elapsed({ since, running, until }: { since: number | null; running: boolean; until?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  if (!since) return null;
  const end = running ? now : (until ?? now);
  return <span className="tabular">{Math.max(0, Math.round((end - since) / 1000))} detik</span>;
}

function recovery(error: string): string {
  const text = error.toLowerCase();
  if (text.includes("budget") || text.includes("kuota")) return "Budget atau kuota API key habis. Naikkan budget key di gateway, atau pakai key lain, lalu jalankan ulang.";
  if (text.includes("network") || text.includes("failed to fetch") || text.includes("load failed")) return "Sambungan ke server terputus. Coba jalankan ulang; untuk WBS besar, matikan Analisis peluang bantuan AI agar lebih cepat.";
  if (text.includes("401") || text.includes("api key")) return "Periksa API key dan penyedia model di Pengaturan, lalu jalankan ulang.";
  if (text.includes("dibatalkan")) return "Jalankan ulang dari Validasi Baru bila perlu.";
  return "Periksa pengaturan model di Pengaturan, lalu jalankan ulang. Data contoh tetap bisa dicoba.";
}

export default function ProcessPage() {
  const router = useRouter();
  const { status, events, error, startedAt, endedAt, modelCalls, cancel, run, aiEnabled, demo, files } = useStore();

  if (status === "idle" && events.length === 0 && !run) {
    return <EmptyState
      title="Belum ada proses berjalan"
      description="Mulai dari Validasi Baru, atau coba dengan data contoh untuk melihat animasi agent."
      href="/validasi"
      action="Ke Validasi Baru"
    />;
  }

  const stateOf = (agent: string, optional?: boolean) => {
    const mine = events.filter((e) => e.agent === agent);
    if (optional && !aiEnabled) return "skipped";
    if (mine.at(-1)?.status === "skipped") return "skipped";
    if (mine.at(-1)?.status === "error") return "error";
    if (mine.at(-1)?.status === "done") return "done";
    if (mine.at(-1)?.status === "running") return status === "error" ? "error" : status === "running" ? "running" : "waiting";
    return "waiting";
  };

  const numFiles = demo ? 1 : files.wbs.length + files.request.length + files.supporting.length;
  const running = status === "running";

  return (
    <div className="tl-page">
      <header className="tl-process-head tl-studio-process-head flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="tl-eyebrow">AGENT OPERATIONS / LIVE MONITOR</p>
          <h1 className="mt-3">Di balik setiap keputusan, <span className="tl-serif">ada proses yang bisa ditelusuri.</span></h1>
          <p>
            {demo
              ? "Data contoh dengan penilai berbasis aturan. Event diputar dengan jeda agar setiap langkah mudah diamati."
              : "Status setiap agent mengikuti event yang diterima dari backend. Tidak menggunakan progress atau persentase rekaan."}
          </p>
          <div className="tl-process-chips">
            <span><Elapsed since={startedAt} running={running} until={endedAt ?? undefined} /></span>
            {modelCalls > 0 && <span className="tabular">{modelCalls} panggilan model</span>}
            <span>{demo ? "Mode data contoh" : "Dokumen pengguna"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {running && <Button variant="danger" onClick={cancel}>Batalkan</Button>}
          {status === "done" && <Button onClick={() => router.push("/hasil/ringkasan")}>Lihat hasil</Button>}
          {status === "error" && <Button variant="secondary" onClick={() => router.push("/validasi")}>Periksa input</Button>}
        </div>
      </header>

      <div className="tl-proc-journey">
        <AgentJourney mode="live" events={events} status={status} aiEnabled={aiEnabled} filesCount={numFiles} />
      </div>

      {status === "error" && error && (
        <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Proses terhenti</strong>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-700">{recovery(error)}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Detail tiap tahap"
          description="Status ini sama dengan event agent yang diterima, termasuk langkah yang dilewati.">
          <ol className="divide-y divide-line">
            {AGENT_STEPS.map((step, i) => {
              const state = stateOf(step.agent, step.optional);
              const last = events.filter((e) => e.agent === step.agent).at(-1);
              return (
                <li key={step.agent} className={"flex items-start gap-3 py-3 " + (state === "running" ? "rounded-md bg-accent-50 px-2" : "")}>
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {state === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    {state === "running" && <Loader2 className="h-5 w-5 animate-spin text-accent-600" />}
                    {state === "waiting" && <Circle className="h-5 w-5 text-slate-300" />}
                    {state === "skipped" && <MinusCircle className="h-5 w-5 text-slate-300" />}
                    {state === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      <span className="mr-2 text-accent-700">{String(i+1).padStart(2,"0")}</span>{step.agent}
                      <span className="sr-only"> status {state === "done" ? "selesai" : state === "running" ? "berjalan" : state === "skipped" ? "dilewati" : state === "error" ? "gagal" : "menunggu"}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {last?.message ?? (state === "skipped" ? "Dimatikan di pengaturan" : step.detail)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="lg:col-span-2" title="Log aktivitas" description="Pembaruan dari backend, terbaru di bawah">
          <ul className="max-h-[540px] space-y-2 overflow-y-auto text-sm" aria-live="polite">
            {events.length === 0 ? (
              <li className="py-7 text-muted">Menunggu event pertama.</li>
            ) : events.map((event, i) => (
              <li key={i} className={"tl-log-entry is-" + event.status}>
                <div className="tl-log-heading">
                  <strong>{event.agent}</strong>
                  <span className="tl-log-pill">{event.status === "running" ? "Bekerja" : event.status === "done" ? "Selesai" : event.status === "skipped" ? "Dilewati" : "Gagal"}</span>
                  {event.at && <time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>}
                </div>
                <p>{event.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
