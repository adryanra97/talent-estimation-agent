"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";

/** Demo sign-in. The reviewer password is shown on purpose so visitors can try the flow. */
export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { signIn, auth } = useStore();
  const [username, setUsername] = useState("reviewer");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label="Nama pengguna">
        {(id) => (
          <select id={id} className={inputClass} value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }}>
            <option value="reviewer">reviewer: kirim feedback</option>
            <option value="admin" disabled={auth ? !auth.admin_enabled : false}>
              admin: setujui atau tolak{auth && !auth.admin_enabled ? " (belum diaktifkan)" : ""}
            </option>
          </select>
        )}
      </Field>
      <Field label="Kata sandi">
        {(id) => (
          <input id={id} type="password" autoComplete="current-password" className={inputClass} value={password}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => { setPassword(e.target.value); setError(null); }} />
        )}
      </Field>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted">
        Akun demo reviewer: <strong className="text-ink">reviewer</strong> / <code className="text-ink">reviewer-demo</code>.
        Kata sandi admin hanya dipegang pemilik demo.
      </div>
      <Button type="submit" disabled={busy || !password}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Masuk
      </Button>
    </form>
  );
}
