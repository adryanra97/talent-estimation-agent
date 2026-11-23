"use client";

import { Loader2, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "@/components/login-form";
import { ResourceHero, ResourceHeading } from "@/components/resource-page";
import { roleName } from "@/components/result-guard";
import { Button, Card, StatusBadge, inputClass } from "@/components/ui";
import { decideFeedback, listFeedback } from "@/lib/api";
import { APPROVE_EFFECT, KIND_LABELS, RATING_LABELS, TARGET_LABELS, when } from "@/lib/feedback";
import { fte } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { FeedbackItem, Guidance } from "@/lib/types";

type Tab = FeedbackItem["status"];
const TABS: [Tab, string][] = [["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"]];

const ratingTone = { accurate: "good", partly: "warn", inaccurate: "bad" } as const;

function FeedbackCard({ item, admin, onChange }: { item: FeedbackItem; admin: boolean; onChange: (f: FeedbackItem) => void }) {
  const { catalog } = useStore();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const d = item.diagnosis;

  async function act(decision: "approve" | "reject" | "activate" | "deactivate") {
    setBusy(decision);
    setError(null);
    try {
      onChange(await decideFeedback(item.id, decision, note));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface" aria-labelledby={`fb-${item.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 id={`fb-${item.id}`} className="font-medium text-ink">
            {item.snapshot.project_name || "Proyek"}{item.role ? ` · ${roleName(item.role, catalog?.roles)}` : ""}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {item.author} · {when(item.created_at)}{item.page ? ` · dari halaman ${item.page}` : ""}
          </p>
        </div>
        <StatusBadge tone={ratingTone[item.rating]}>{RATING_LABELS[item.rating]}</StatusBadge>
      </header>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
        <section aria-label="Catatan reviewer">
          <p className="text-xs font-semibold tracking-wide text-muted">CATATAN REVIEWER</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">{item.text}</p>
          {item.snapshot.roles.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-accent-700">Angka saat feedback ditulis</summary>
              <table className="mt-2 w-full text-xs">
                <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Role</th><th className="py-1 text-right font-medium">Diminta</th><th className="py-1 text-right font-medium">UCP</th><th className="py-1 text-right font-medium">BU</th></tr></thead>
                <tbody>
                  {item.snapshot.roles.map((r) => (
                    <tr key={r.role} className="border-t border-line"><td className="py-1">{r.role}</td><td className="tabular py-1 text-right">{fte(r.requested_fte)}</td><td className="tabular py-1 text-right">{fte(r.ucp_fte)}</td><td className="tabular py-1 text-right">{fte(r.bu_fte)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>

        <section aria-label="Diagnosis Feedback Agent" className="rounded-lg bg-canvas p-4">
          <p className="text-xs font-semibold tracking-wide text-muted">DIAGNOSIS FEEDBACK AGENT</p>
          {d ? (
            <>
              <p className="mt-2 flex flex-wrap gap-2">
                <StatusBadge tone="accent">{TARGET_LABELS[d.target]}</StatusBadge>
                <StatusBadge tone="neutral">{KIND_LABELS[d.kind]}</StatusBadge>
              </p>
              <p className="mt-3 text-sm text-ink">{d.summary}</p>
              {d.proposal && (
                <>
                  <p className="mt-3 text-xs font-medium text-muted">Usulan</p>
                  <blockquote className="mt-1 border-l-2 border-accent-500 pl-3 text-sm text-ink">{d.proposal}</blockquote>
                </>
              )}
              <p className="mt-3 text-xs text-muted">Keyakinan {d.confidence} · {d.by === "model" ? "dinilai model" : "dinilai dengan aturan"}</p>
            </>
          ) : <p className="mt-2 text-sm text-muted">Belum ada diagnosis.</p>}
        </section>
      </div>

      <footer className="border-t border-line px-5 py-4 text-sm">
        {item.status === "pending" ? (
          admin ? (
            <div className="grid gap-3">
              {d && <p className="text-xs text-muted">{APPROVE_EFFECT[d.kind]}</p>}
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-ink">Catatan keputusan <span className="font-normal text-muted">(opsional)</span></span>
                <input className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: setuju, tapi hanya untuk proyek dashboard" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void act("approve")} disabled={busy !== null}>
                  {busy === "approve" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Setujui
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void act("reject")} disabled={busy !== null}>
                  {busy === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Tolak
                </Button>
              </div>
            </div>
          ) : <p className="text-muted">Menunggu keputusan admin.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">
              {item.status === "approved" ? "Disetujui" : "Ditolak"} oleh {item.decided_by} · {when(item.decided_at)}
              {item.decision_note ? `. Catatan: ${item.decision_note}` : ""}
            </p>
            {admin && item.status === "approved" && d?.kind === "prompt_guidance" && (
              <Button size="sm" variant="secondary" onClick={() => void act(item.active ? "deactivate" : "activate")} disabled={busy !== null}>
                {item.active ? "Nonaktifkan panduan" : "Aktifkan lagi"}
              </Button>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      </footer>
    </article>
  );
}

export default function FeedbackPage() {
  const { auth, signOut } = useStore();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [guidance, setGuidance] = useState<Guidance[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [error, setError] = useState<string | null>(null);
  const user = auth?.user ?? null;
  const admin = user?.role === "admin";

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listFeedback();
      setItems(data.items);
      setGuidance(data.guidance);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (user) void load();
    else setItems(null);
  }, [user, load]);

  function replace(next: FeedbackItem) {
    setItems((list) => list?.map((f) => (f.id === next.id ? next : f)) ?? null);
    void load();
  }

  const counts = Object.fromEntries(TABS.map(([t]) => [t, items?.filter((f) => f.status === t).length ?? 0]));
  const shown = items?.filter((f) => f.status === tab) ?? [];

  return (
    <div className="tl-resource-page">
      <ResourceHero
        eyebrow="TALENTLENS / SIKLUS FEEDBACK"
        chapter="PEMBELAJARAN / 01"
        title="Feedback dan"
        accent="perbaikan agent."
        description="Reviewer menulis apa yang kurang tepat. Feedback Agent mendiagnosis bagian yang perlu diperbaiki dan menyusun usulan. Admin memutuskan; hanya usulan yang disetujui yang dipakai agent pada run berikutnya."
      />
      <div className="tl-resource-body">
        <ol className="mb-8 grid gap-3 text-sm sm:grid-cols-4" aria-label="Alur feedback">
          {[
            ["Reviewer", "Menulis feedback dari halaman hasil."],
            ["Feedback Agent", "Menentukan agent atau data yang perlu diperbaiki dan mengusulkan perubahan."],
            ["Admin", "Menyetujui atau menolak. Semua keputusan tercatat."],
            ["Run berikutnya", "Panduan yang disetujui ditambahkan ke prompt agent terkait."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium text-ink"><span className="tabular mr-1.5 text-accent-700">{i + 1}</span>{t}</p>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>

        {auth?.storage === "memory" && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Mode demo.</strong> Feedback disimpan sementara dan bisa hilang saat server dimulai ulang.
          </p>
        )}

        {!user ? (
          <Card title="Masuk untuk melihat feedback" className="max-w-md">
            <LoginForm />
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted">Masuk sebagai <strong className="text-ink">{user.name}</strong>{admin ? " (bisa menyetujui)" : " (bisa mengirim feedback)"}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => void load()}><RefreshCw className="h-3.5 w-3.5" aria-hidden /> Muat ulang</Button>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" aria-hidden /> Keluar</Button>
              </div>
            </div>

            <ResourceHeading index="01" label="PANDUAN AKTIF" title="Panduan yang sedang dipakai agent"
              description="Ditambahkan ke prompt agent terkait saat analisis memakai model. Mode data contoh tidak memakai model, jadi tidak terpengaruh." />
            {guidance.length === 0 ? (
              <p className="mb-10 text-sm text-muted">Belum ada panduan aktif.</p>
            ) : (
              <ul className="mb-10 divide-y divide-line rounded-xl border border-line bg-surface">
                {guidance.map((g) => (
                  <li key={g.id} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[180px_1fr]">
                    <span className="self-start"><StatusBadge tone="accent">{TARGET_LABELS[g.target]}</StatusBadge></span>
                    <p className="text-ink">{g.text}<span className="block text-xs text-muted">Disetujui {g.approved_by} · {when(g.approved_at)}</span></p>
                  </li>
                ))}
              </ul>
            )}

            <ResourceHeading index="02" label="FEEDBACK" title="Semua feedback"
              description="Feedback baru bisa dikirim dari setiap halaman hasil lewat tombol Beri feedback." />
            <div className="mb-5 inline-flex rounded-lg border border-line bg-canvas p-1" role="tablist" aria-label="Status feedback">
              {TABS.map(([t, label]) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`rounded-md px-4 py-1.5 text-sm ${tab === t ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted"}`}>
                  {label} <span className="tabular text-xs">{counts[t]}</span>
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
            {items === null ? (
              <p className="text-sm text-muted">Memuat…</p>
            ) : shown.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
                {tab === "pending" ? <>Tidak ada feedback yang menunggu. <Link href="/" className="text-accent-700 hover:underline">Jalankan analisis</Link>, lalu kirim feedback dari halaman hasil.</> : "Belum ada feedback di sini."}
              </p>
            ) : (
              <div className="grid gap-4" role="tabpanel">
                {shown.map((f) => <FeedbackCard key={f.id} item={f} admin={admin} onChange={replace} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
