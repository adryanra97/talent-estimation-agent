"use client";

import {
  ArrowRight, BrainCircuit, Check, Circle, ClipboardCheck,
  FileCheck2, FileSpreadsheet, FileText, GitBranch,
  Loader2, Pause, Play, Search, Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProgressEvent } from "@/lib/types";
import type { RunStatus } from "@/lib/store";

type StepState = "waiting" | "running" | "done" | "skipped" | "error";
type Step = {
  agent: string;
  title: string;
  detail: string;
  icon: typeof FileText;
  optional?: boolean;
};

export const AGENT_STEPS: Step[] = [
  { agent: "Orchestrator", title: "Orchestrator", detail: "Menyiapkan alur kerja", icon: GitBranch },
  { agent: "Intake Agent", title: "Intake", detail: "Membaca WBS & dokumen", icon: Search },
  { agent: "Estimator Agent", title: "Estimator", detail: "Capability, UCP & bottom-up", icon: BrainCircuit },
  { agent: "Reviewer Agent", title: "Reviewer", detail: "Memeriksa & menilai ulang", icon: ClipboardCheck },
  { agent: "Augmentation Agent", title: "AI Augmentation", detail: "Peluang bantuan AI", icon: Sparkles, optional: true },
  { agent: "Report", title: "Report", detail: "Menyusun hasil & draf", icon: FileCheck2 },
];

function deriveState(
  step: Step,
  events: ProgressEvent[],
  status: RunStatus,
  aiEnabled: boolean,
): StepState {
  if (step.optional && !aiEnabled) return "skipped";
  const mine = events.filter((event) => event.agent === step.agent);
  const last = mine.at(-1);
  if (!last) return "waiting";
  if (last.status === "skipped") return "skipped";
  if (last.status === "error") return "error";
  if (last.status === "done") return "done";
  if (status === "error") return "error";
  if (status === "idle") return "waiting";
  return last.status === "running" && status === "running" ? "running" : "waiting";
}

const LABEL: Record<StepState, string> = {
  waiting: "Menunggu",
  running: "Sedang bekerja",
  done: "Selesai",
  skipped: "Dilewati",
  error: "Terhenti",
};

type Props = {
  mode?: "preview" | "live";
  events?: ProgressEvent[];
  status?: RunStatus;
  aiEnabled?: boolean;
  filesCount?: number;
  className?: string;
};

/**
 * Home: explicitly illustrative stage cycle, never presented as backend activity.
 * /proses: state derives only from the streaming agent events, not elapsed time.
 */
export default function AgentJourney({
  mode = "preview",
  events = [],
  status = "idle",
  aiEnabled = true,
  filesCount = 0,
  className = "",
}: Props) {
  const preview = mode === "preview";
  const [previewIndex, setPreviewIndex] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!preview || !playing || reduceMotion) return;
    const handle = window.setInterval(() => setPreviewIndex((i) => (i + 1) % AGENT_STEPS.length), 1900);
    return () => window.clearInterval(handle);
  }, [preview, playing, reduceMotion]);

  const states = useMemo<StepState[]>(
    () => preview
      ? AGENT_STEPS.map((_, i) => i < previewIndex ? "done" : i === previewIndex ? "running" : "waiting")
      : AGENT_STEPS.map((step) => deriveState(step, events, status, aiEnabled)),
    [preview, previewIndex, events, status, aiEnabled],
  );
  const activeIndex = preview
    ? previewIndex
    : states.findIndex((s) => s === "running");
  const current = activeIndex >= 0 ? AGENT_STEPS[activeIndex] : null;
  const lastProgress = [...events].reverse().find((event) => event.type === "progress");
  const complete = !preview && status === "done";
  const failed = !preview && status === "error";

  return (
    <section
      className={"tl-journey " + (preview ? "tl-journey-preview " : "tl-journey-live ") + className}
      aria-label={preview ? "Pratinjau animasi alur TalentLens" : "Status agent yang sedang memproses dokumen"}
    >
      <div className="tl-journey-toolbar">
        <span className="tl-journey-kicker">
          <i className={current ? "tl-dot tl-dot-active" : "tl-dot"} aria-hidden="true" />
          {preview ? "AGENT WORKFLOW · PRATINJAU" : "AGENT WORKFLOW · STATUS SEBENARNYA"}
        </span>
        {preview ? (
          <button className="tl-journey-pause" type="button" onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Jeda animasi ilustrasi" : "Putar animasi ilustrasi"}
            aria-pressed={!playing}>
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? "Jeda" : "Putar"}
          </button>
        ) : (
          <span className="tl-journey-timing">{complete ? "Analisis selesai" : failed ? "Proses terhenti" : status === "running" ? "Mengikuti event backend" : "Siap"}</span>
        )}
      </div>

      <div className="tl-journey-canvas">
        <div className="tl-journey-input">
          <div className={"tl-doc-mascot" + (current && !reduceMotion && (preview ? playing : status === "running") ? " is-working" : "")} aria-hidden="true">
            <div className="tl-doc-fold" />
            <div className="tl-doc-eyes"><i/><i/></div>
            <div className="tl-doc-smile"/>
            <div className="tl-doc-lines"><i/><i/><i/></div>
          </div>
          <div>
            <strong>{preview ? "WBS proyek" : filesCount > 0 ? filesCount + " dokumen masuk" : "Dokumen proyek"}</strong>
            <span>{preview ? "WBS.xlsx · Brief.pdf" : "WBS · permintaan · lampiran"}</span>
          </div>
        </div>

        <div className={"tl-journey-transfer" + (current && !reduceMotion && (preview ? playing : status === "running") ? " is-moving" : "")}
          aria-hidden="true">
          <span className="tl-journey-transfer-line"/>
          <span className="tl-journey-packet"><FileText size={13}/></span>
          <ArrowRight size={15}/>
        </div>

        <div className="tl-agent-grid">
          {AGENT_STEPS.map((step, i) => {
            const state = states[i];
            const Icon = step.icon;
            return (
              <div key={step.agent} className={"tl-agent-node is-" + state} aria-current={state === "running" ? "step" : undefined}>
                <span className="tl-agent-counter">{String(i+1).padStart(2,"0")}</span>
                <span className="tl-agent-icon"><Icon size={19} strokeWidth={1.8} aria-hidden/></span>
                <span className="tl-agent-info">
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
                <span className="tl-agent-state" aria-label={LABEL[state]}>
                  {state === "done" ? <Check size={14} aria-hidden /> : state === "running" ? <Loader2 size={15} className="tl-agent-spin" aria-hidden /> : <Circle size={12} aria-hidden />}
                </span>
                <span className="sr-only">Status: {LABEL[state]}</span>
              </div>
            );
          })}
        </div>

        <div className={"tl-journey-output" + (complete ? " is-ready" : "")} aria-label="Output yang disiapkan TalentLens">
          <span className="tl-output-label">OUTPUT</span>
          <div>{complete ? <Check size={14} aria-hidden/> : <Circle size={12} aria-hidden/>}<span>Capability</span></div>
          <div>{complete ? <Check size={14} aria-hidden/> : <Circle size={12} aria-hidden/>}<span>UCP / Bottom-up</span></div>
          <div>{complete ? <Check size={14} aria-hidden/> : <Circle size={12} aria-hidden/>}<span>FTE & review</span></div>
          <span className="tl-output-note">{complete ? "Hasil siap direview" : "Disiapkan saat proses selesai"}</span>
        </div>
      </div>

      <div className="tl-journey-status" aria-live={preview ? "off" : "polite"}>
        <div className="tl-status-head">
          <span className="tl-status-label">{preview ? "CONTOH PERJALANAN DOKUMEN" : "STATUS PIPELINE"}</span>
          <span className="tl-status-fraction">{preview ? "Simulasi visual" : states.filter(s => s === "done").length + " / " + AGENT_STEPS.filter(s => !s.optional || aiEnabled).length + " langkah selesai"}</span>
        </div>
        <p>
          {preview
            ? current ? <><strong>{current.title}</strong> sedang ditunjukkan. Ini ilustrasi cara kerja agent, bukan proses analisis nyata.</> : "Pratinjau perjalanan dokumen."
            : complete ? "Semua langkah yang dijalankan selesai. Hasil tersedia untuk direview."
            : failed ? "Proses terhenti. Periksa pesan error dan log aktivitas di bawah."
            : lastProgress ? <><strong>{lastProgress.agent}</strong> — {lastProgress.message}</>
            : status === "running" ? "Dokumen sedang disiapkan. Menunggu event pertama dari server."
            : "Jalankan validasi untuk melihat status agent secara langsung."}
        </p>
      </div>
    </section>
  );
}
