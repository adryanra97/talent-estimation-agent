"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

const STEPS = [
  { agent: "Orchestrator", description: "Menerima file dan mengatur urutan kerja" },
  { agent: "Intake Agent", description: "Membaca WBS dan dokumen permintaan" },
  { agent: "Estimator Agent", description: "Menilai role, kelas, dan alokasi; menghitung UCP dan bottom-up" },
  { agent: "Reviewer Agent", description: "Membandingkan dua metode, mengirim baris janggal untuk dinilai ulang" },
  { agent: "Augmentation Agent", description: "Memetakan tugas yang dapat dibantu AI", optional: true },
  { agent: "Report", description: "Menyusun ringkasan dan draf pesan" },
];

function Elapsed({ since, running, until }: { since: number | null; running: boolean; until?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  if (!since) return null;
  const end = running ? now : (until ?? now);
  const seconds = Math.max(0, Math.round((end - since) / 1000));
  return <span className="tabular">{seconds} detik</span>;
}

export default function ProcessPage() {
  const router = useRouter();
  const { status, events, error, startedAt, endedAt, modelCalls, cancel, run, aiEnabled, demo } = useStore();

  if (status === "idle" && events.length === 0 && !run) {
    return (
      <EmptyState
        title="Belum ada proses berjalan"
        description="Mulai dari Validasi Baru, atau coba dengan data contoh."
        href="/validasi"
        action="Ke Validasi Baru"
      />
    );
  }

  const stateOf = (agent: string, optional?: boolean) => {
    const mine = events.filter((e) => e.agent === agent);
    if (optional && !aiEnabled) return "skipped";
    if (mine.at(-1)?.status === "skipped") return "skipped";
    if (mine.some((e) => e.status === "done") && !(status === "running" && mine.at(-1)?.status === "running")) return "done";
    if (mine.length > 0) return status === "error" ? "error" : "running";
    return status === "done" ? "done" : "waiting";
  };

  return (
    <>
      <PageHeader
        title="Proses"
        description={demo ? "Data contoh dengan penilai berbasis aturan. Jeda tiap langkah disimulasikan agar alurnya terlihat." : "Agent bekerja berurutan. Lamanya bergantung pada jumlah item."}
        actions={
          status === "running" ? (
            <Button variant="danger" onClick={cancel}>
              Batalkan
            </Button>
          ) : status === "done" ? (
            <Button onClick={() => router.push("/hasil/ringkasan")}>Lihat hasil</Button>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Langkah agent" actions={<span className="text-sm text-muted"><Elapsed since={startedAt} running={status === "running"} until={endedAt ?? undefined} />
                {modelCalls > 0 && <span className="tabular">, {modelCalls} panggilan model</span>}</span>}>
          <ol className="space-y-1">
            {STEPS.map((step, i) => {
              const state = stateOf(step.agent, step.optional);
              const last = events.filter((e) => e.agent === step.agent).at(-1);
              return (
                <li key={step.agent} className="flex gap-3 rounded-lg px-2 py-3">
                  <span className="mt-0.5" aria-hidden>
                    {state === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    {state === "running" && <Loader2 className="h-5 w-5 animate-spin text-accent-600" />}
                    {state === "waiting" && <Circle className="h-5 w-5 text-slate-300" />}
                    {state === "skipped" && <MinusCircle className="h-5 w-5 text-slate-300" />}
                    {state === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {i + 1}. {step.agent}
                      <span className="sr-only">
                        {" "}
                        status {state === "done" ? "selesai" : state === "running" ? "berjalan" : state === "skipped" ? "dilewati" : state === "error" ? "gagal" : "menunggu"}
                      </span>
                    </p>
                    <p className="text-sm text-muted">{last?.message ?? (state === "skipped" ? "Dimatikan di pengaturan" : step.description)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          {status === "error" && error && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Proses berhenti</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-red-700">
                Periksa API key dan model di Pengaturan, lalu jalankan ulang. Data contoh tetap bisa dicoba.
              </p>
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2" title="Log aktivitas" description="Terbaru di bawah">
          <ul className="max-h-[480px] space-y-2 overflow-y-auto text-sm" aria-live="polite">
            {events.map((e, i) => (
              <li key={i} className="border-l-2 border-line pl-3">
                <span className="font-medium text-ink">{e.agent}</span>
                <span className="block text-muted">{e.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
