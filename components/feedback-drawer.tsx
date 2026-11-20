"use client";

import { CheckCircle2, Loader2, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Drawer } from "@/components/drawer";
import { LoginForm } from "@/components/login-form";
import { roleName } from "@/components/result-guard";
import { Button, Field, StatusBadge, inputClass } from "@/components/ui";
import { sendFeedback } from "@/lib/api";
import { KIND_LABELS, RATING_LABELS, TARGET_LABELS, snapshot } from "@/lib/feedback";
import { RESULT_LINKS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { FeedbackItem, FeedbackRating } from "@/lib/types";

const MIN = 20;
const MAX = 2000;

/** Button plus drawer to send feedback on the result currently shown. */
export function FeedbackButton({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { run, auth, catalog, provider, apiKey, demo } = useStore();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<FeedbackRating>("partly");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<FeedbackItem | null>(null);
  const ratingName = useId();

  if (!run) return null;
  const page = RESULT_LINKS.find((l) => l.href === pathname)?.label ?? null;
  const tooShort = text.trim().length < MIN;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!run || tooShort) return;
    setBusy(true);
    setError(null);
    try {
      const item = await sendFeedback(
        { rating, text: text.trim(), page, role: role || null, snapshot: snapshot(run), provider },
        demo ? "" : apiKey,
      );
      setSent(item);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(null);
    setError(null);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4" aria-hidden />
        <span className={compact ? "sr-only" : "hidden sm:inline"}>Beri feedback</span>
        {!compact && <span className="sr-only sm:hidden">Beri feedback</span>}
      </Button>
      <Drawer open={open} onClose={close} title="Feedback atas hasil ini"
        subtitle="Feedback Agent membaca catatanmu dan mengusulkan perbaikan. Usulan baru dipakai setelah admin menyetujuinya.">
        <div className="grid gap-5 overflow-y-auto px-6 py-5">
          {!auth?.user ? (
            <>
              <p className="text-sm text-muted">Masuk dulu agar feedback tersimpan atas namamu.</p>
              <LoginForm />
            </>
          ) : sent ? (
            <div className="grid gap-4" role="status">
              <p className="flex items-center gap-2 font-medium text-emerald-800">
                <CheckCircle2 className="h-5 w-5" aria-hidden /> Feedback tersimpan dan menunggu persetujuan admin.
              </p>
              {sent.diagnosis && (
                <div className="rounded-lg border border-line bg-canvas p-4 text-sm">
                  <p className="text-xs font-semibold tracking-wide text-muted">DIAGNOSIS FEEDBACK AGENT</p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge tone="accent">{TARGET_LABELS[sent.diagnosis.target]}</StatusBadge>
                    <StatusBadge tone="neutral">{KIND_LABELS[sent.diagnosis.kind]}</StatusBadge>
                  </p>
                  <p className="mt-3 text-ink">{sent.diagnosis.summary}</p>
                  {sent.diagnosis.proposal && (
                    <blockquote className="mt-3 border-l-2 border-accent-500 pl-3 text-muted">{sent.diagnosis.proposal}</blockquote>
                  )}
                  <p className="mt-3 text-xs text-muted">
                    Keyakinan {sent.diagnosis.confidence}, {sent.diagnosis.by === "model" ? "dinilai model" : "dinilai dengan aturan karena model tidak dipakai"}.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href="/feedback" className="inline-flex items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
                  Buka menu Feedback
                </Link>
                <Button variant="secondary" onClick={() => setSent(null)}>Tulis feedback lain</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5" noValidate>
              <fieldset>
                <legend className="text-sm font-medium text-ink">Seberapa tepat hasil ini?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(Object.keys(RATING_LABELS) as FeedbackRating[]).map((r) => (
                    <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${rating === r ? "border-accent-500 bg-accent-50 text-accent-700" : "border-line text-ink"}`}>
                      <input type="radio" name={ratingName} value={r} checked={rating === r} onChange={() => setRating(r)} className="accent-current" />
                      {RATING_LABELS[r]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Role yang dibahas" hint="Kosongkan bila feedback berlaku untuk semua role.">
                {(id) => (
                  <select id={id} className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">Semua role</option>
                    {run.roles.map((r) => <option key={r} value={r}>{roleName(r, catalog?.roles)}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Apa yang kurang tepat?"
                hint={`${text.trim().length}/${MAX} karakter${tooShort ? `, minimal ${MIN}` : ""}. Tulis contoh item WBS bila ada; jangan tulis data pribadi.`}>
                {(id) => (
                  <textarea id={id} rows={6} maxLength={MAX} className={inputClass} value={text}
                    placeholder="Contoh: Data Scientist terlalu tinggi. Item dashboard monitoring cukup didukung DS, bukan dipimpin."
                    onChange={(e) => setText(e.target.value)} />
                )}
              </Field>
              {page && <p className="text-xs text-muted">Dikirim dari halaman {page}, bersama ringkasan angka per role. Dokumen proyek tidak ikut dikirim.</p>}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <Button type="submit" disabled={busy || tooShort}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Kirim feedback
              </Button>
            </form>
          )}
        </div>
      </Drawer>
    </>
  );
}
