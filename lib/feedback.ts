import { date } from "./format";
import type { Diagnosis, FeedbackRating, FeedbackTarget, RunResult, RunSnapshot } from "./types";

export const TARGET_LABELS: Record<FeedbackTarget, string> = {
  intake: "Intake Agent",
  estimator: "Estimator Agent",
  reviewer: "Reviewer Agent",
  augmentation: "Augmentation Agent",
  report: "Report",
  catalog: "Katalog capability",
  parameter: "Parameter hitung",
  data: "Data masukan",
};

export const KIND_LABELS: Record<Diagnosis["kind"], string> = {
  prompt_guidance: "Panduan tambahan untuk agent",
  catalog_change: "Perubahan katalog",
  parameter_change: "Perubahan parameter",
  no_change: "Tidak perlu perubahan",
};

export const RATING_LABELS: Record<FeedbackRating, string> = {
  accurate: "Akurat",
  partly: "Sebagian akurat",
  inaccurate: "Tidak akurat",
};

/** What happens when an admin approves each kind of proposal. */
export const APPROVE_EFFECT: Record<Diagnosis["kind"], string> = {
  prompt_guidance: "Disetujui = panduan langsung dipakai di prompt agent pada run berikutnya (selain mode demo). Bisa dinonaktifkan kapan saja.",
  catalog_change: "Disetujui = ditandai untuk diterapkan manual di Katalog Capability. Tidak mengubah apa pun secara otomatis.",
  parameter_change: "Disetujui = ditandai untuk diterapkan manual di parameter hitung. Tidak mengubah apa pun secara otomatis.",
  no_change: "Disetujui = feedback dicatat sebagai konfirmasi bahwa hasil sudah tepat.",
};

/** The numbers of a run that a reviewer was looking at, without any document text. */
export function snapshot(run: RunResult): RunSnapshot {
  return {
    project_name: run.project.name || "Proyek tanpa nama",
    period: `${date(run.project.start)} s.d. ${date(run.project.end)}`,
    roles: run.comparisons.slice(0, 20).map((c) => ({
      role: c.role, requested_fte: c.requested_fte, ucp_fte: c.ucp_fte, bu_fte: c.bu_fte, conclusion: c.conclusion,
    })),
    review_rows: run.breakdown.filter((r) => r.needs_review).length,
    guidance_used: [],
  };
}

export function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
