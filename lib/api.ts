import type { Catalog, ProviderConfig, RunResult, WbsPreview } from "./types";

const BASE = "/api/py";

async function failure(res: Response): Promise<Error> {
  try {
    const body = await res.json();
    return new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
  } catch {
    return new Error(`Permintaan gagal (${res.status}).`);
  }
}

function keyHeader(apiKey: string): Record<string, string> {
  return apiKey ? { "X-LLM-Api-Key": apiKey } : {};
}

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(`${BASE}/catalog`);
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function parseCatalog(file: File): Promise<Catalog> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/catalog/parse`, { method: "POST", body: form });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function downloadCatalogExcel(catalog: Catalog | null): Promise<void> {
  const res = await fetch(`${BASE}/catalog/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalog }),
  });
  if (!res.ok) throw await failure(res);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "Katalog_Capability.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export async function previewWbs(file: File): Promise<WbsPreview> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/wbs/preview`, { method: "POST", body: form });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function testConnection(provider: ProviderConfig, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE}/llm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...keyHeader(apiKey) },
    body: JSON.stringify(provider),
  });
  if (!res.ok) throw await failure(res);
  return (await res.json()).reply;
}

export interface RunFiles {
  wbs?: File | null;
  request?: File | null;
  supporting?: File | null;
}

/** Start a run and call `onEvent` for every line of the NDJSON stream. */
export async function startRun(
  settings: unknown,
  files: RunFiles,
  apiKey: string,
  onEvent: (event: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.append("settings", JSON.stringify(settings));
  if (files.wbs) form.append("wbs", files.wbs);
  if (files.request) form.append("request_doc", files.request);
  if (files.supporting) form.append("supporting_doc", files.supporting);
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    body: form,
    headers: keyHeader(apiKey),
    signal,
  });
  if (!res.ok || !res.body) throw await failure(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) onEvent(JSON.parse(line));
      index = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

export async function recalculate(run: RunResult, catalog: Catalog | null): Promise<RunResult> {
  const res = await fetch(`${BASE}/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run, catalog }),
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function reclassify(
  run: RunResult,
  catalog: Catalog | null,
  requests: { item_id: string; role: string; reason: string }[],
  provider: ProviderConfig,
  apiKey: string,
  demo: boolean,
): Promise<RunResult> {
  const res = await fetch(`${BASE}/reclassify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...keyHeader(apiKey) },
    body: JSON.stringify({ run, catalog, requests, provider, demo }),
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function downloadExcel(run: RunResult, catalog: Catalog | null): Promise<void> {
  const res = await fetch(`${BASE}/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run, catalog }),
  });
  if (!res.ok) throw await failure(res);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? "Validasi_Talent.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
