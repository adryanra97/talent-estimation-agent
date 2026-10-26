"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button, Card, Field, PageHeader, Toggle, inputClass } from "@/components/ui";
import { testConnection } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Provider } from "@/lib/types";

const PROVIDERS: { value: Provider; label: string; models: string[]; note: string }[] = [
  { value: "google", label: "Google Gemini", models: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview"], note: "Key dari Google AI Studio (aistudio.google.com/apikey). Tier gratis cukup untuk uji coba, tetapi data dapat dipakai Google untuk perbaikan produk: pakai data fiktif atau demo." },
  { value: "anthropic", label: "Anthropic Claude", models: ["claude-sonnet-5-5", "claude-haiku-5-5"], note: "Key dari Anthropic Console. Cek nama model terbaru di dokumentasi penyedia." },
  { value: "openai", label: "OpenAI", models: ["gpt-4.1-mini", "gpt-4.1"], note: "Key dari OpenAI Platform." },
  { value: "azure", label: "Azure OpenAI", models: [], note: "Isi endpoint resource dan nama deployment." },
  { value: "openai_compatible", label: "Endpoint kustom (OpenAI-compatible)", models: [], note: "Untuk gateway yang memakai format OpenAI. Tulis nama model persis seperti di gateway, termasuk awalan penyedianya bila ada (misalnya azure_ai/nama-model)." },
];

function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const index = line.indexOf(":");
    if (index > 0) {
      const name = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (name && value) headers[name] = value;
    }
  }
  return headers;
}

export default function SettingsPage() {
  const { provider, setProvider, apiKey, setApiKey } = useStore();
  const [headersText, setHeadersText] = useState(() =>
    Object.entries(provider.extra_headers ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  );
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const current = PROVIDERS.find((p) => p.value === provider.provider)!;
  const needsUrl = provider.provider === "azure" || provider.provider === "openai_compatible";

  const AUTO = { send_temperature: true, structured_method: "auto" as const };

  async function test() {
    setState("testing");
    setNotes([]);
    try {
      const fresh = { ...provider, ...AUTO };
      const result = await testConnection(fresh, apiKey);
      setProvider({
        ...fresh,
        send_temperature: result.send_temperature,
        structured_method: result.structured_method,
        max_tokens: result.max_tokens,
      });
      setState("ok");
      setNotes(result.adjustments);
      setMessage(`Terhubung. Model menjawab "${result.reply}".`);
    } catch (err) {
      setState("fail");
      const text = err instanceof Error ? err.message : String(err);
      setMessage(
        /cors|network|fetch/i.test(text)
          ? `${text}. Kemungkinan endpoint tidak bisa dijangkau dari server.`
          : text,
      );
    }
  }

  return (
    <>
      <PageHeader title="Pengaturan" description="Model bahasa yang dipakai agent. Key hanya tersimpan di tab ini." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Model bahasa">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Penyedia" hint={current.note}>
              {(id) => (
                <select
                  id={id}
                  className={inputClass}
                  value={provider.provider}
                  onChange={(e) => {
                    const next = PROVIDERS.find((p) => p.value === e.target.value)!;
                    setProvider({ ...provider, ...AUTO, provider: next.value, model: next.models[0] ?? "", base_url: null, api_version: null });
                    setState("idle");
                  }}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={provider.provider === "azure" ? "Nama deployment" : "Model"} hint={current.models.length ? `Contoh: ${current.models.join(", ")}` : undefined}>
              {(id) => (
                <>
                  <input id={id} list="models" className={inputClass} value={provider.model} onChange={(e) => setProvider({ ...provider, ...AUTO, model: e.target.value })} />
                  <datalist id="models">
                    {current.models.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            {needsUrl && (
              <Field label={provider.provider === "azure" ? "Endpoint resource" : "Base URL"} hint={provider.provider === "azure" ? "Contoh: https://nama-resource.openai.azure.com" : "Alamat dasar gateway, tanpa /chat/completions. Contoh: https://gateway.contoh.id/v1"}>
                {(id) => <input id={id} className={inputClass} value={provider.base_url ?? ""} onChange={(e) => setProvider({ ...provider, ...AUTO, base_url: e.target.value || null })} />}
              </Field>
            )}
            {provider.provider === "azure" && (
              <Field label="API version" hint="Bawaan 2024-10-21">
                {(id) => <input id={id} className={inputClass} value={provider.api_version ?? ""} onChange={(e) => setProvider({ ...provider, ...AUTO, api_version: e.target.value || null })} />}
              </Field>
            )}
            {provider.provider === "openai_compatible" && (
              <>
                <Field label="Batas token jawaban" hint="Dikirim sebagai max_tokens. Gateway yang meneruskan ke Claude membutuhkannya.">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      min={256}
                      max={64000}
                      step={256}
                      className={`${inputClass} tabular`}
                      value={provider.max_tokens ?? ""}
                      onChange={(e) => setProvider({ ...provider, ...AUTO, max_tokens: e.target.value ? Number(e.target.value) : null })}
                    />
                  )}
                </Field>
                <Field label="Header tambahan (opsional)" hint="Satu header per baris, misalnya User-Agent: curl/8.0. Isi bila dokumentasi gateway memintanya.">
                  {(id) => (
                    <textarea
                      id={id}
                      rows={2}
                      className={`${inputClass} font-mono text-xs`}
                      value={headersText}
                      onChange={(e) => {
                        setHeadersText(e.target.value);
                        setProvider({ ...provider, ...AUTO, extra_headers: parseHeaders(e.target.value) });
                      }}
                    />
                  )}
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              <Field label="API key" hint="Disimpan hanya di memori tab ini dan dikirim per permintaan. Tidak pernah disimpan di server.">
                {(id) => (
                  <div className="flex gap-2">
                    <input
                      id={id}
                      type={show ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      className={`${inputClass} font-mono`}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value.trim());
                        setState("idle");
                      }}
                    />
                    <Button variant="secondary" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan key" : "Tampilkan key"}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Toggle
                checked={provider.mask_pii}
                onChange={(v) => setProvider({ ...provider, mask_pii: v })}
                label="Samarkan data pribadi sebelum dikirim ke model"
                description="E-mail, nomor telepon, dan nomor identitas 16 digit diganti placeholder."
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button onClick={test} disabled={!apiKey || !provider.model || state === "testing"}>
              {state === "testing" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Tes koneksi
            </Button>
            {state === "ok" && (
              <div className="text-sm" role="status">
                <p className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {message}
                </p>
                {notes.length > 0 && (
                  <p className="mt-1 text-muted">
                    Disesuaikan otomatis untuk endpoint ini: {notes.join("; ")}. Pengaturan ini dipakai saat validasi.
                  </p>
                )}
              </div>
            )}
            {state === "fail" && (
              <p className="flex max-w-2xl items-start gap-1.5 text-sm text-red-700" role="alert">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span className="break-words">{message}</span>
              </p>
            )}
          </div>
        </Card>
        <Card title="Privasi">
          <ul className="space-y-3 text-sm text-ink">
            <li>Server tidak punya database dan tidak menulis file. Setiap permintaan berdiri sendiri.</li>
            <li>File WBS dan dokumen diproses di memori lalu dibuang.</li>
            <li>Hasil run hanya ada di tab ini. Menutup tab berarti hasil hilang, jadi unduh Excel bila perlu.</li>
            <li>Model hanya menerima teks yang dibutuhkan untuk menilai, bukan file asli.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
