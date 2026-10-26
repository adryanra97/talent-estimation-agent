const id = "id-ID";

export function fte(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString(id, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString(id, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(value: number | null | undefined, digits = 0, signed = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const text = (value * 100).toLocaleString(id, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${signed && value > 0 ? "+" : ""}${text}%`;
}

export function date(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString(id, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function month(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(id, { month: "short", year: "numeric" });
}

export const ROLE_STYLE: Record<string, string> = {
  DE: "bg-sky-50 text-sky-800 ring-sky-200",
  DA: "bg-teal-50 text-teal-800 ring-teal-200",
  DS: "bg-amber-50 text-amber-800 ring-amber-200",
  AI: "bg-accent-50 text-accent-700 ring-accent-200",
  UXR: "bg-pink-50 text-pink-800 ring-pink-200",
  UX: "bg-orange-50 text-orange-800 ring-orange-200",
  UI: "bg-lime-50 text-lime-800 ring-lime-200",
};

export const ROLE_COLOR: Record<string, string> = {
  DE: "#0284c7",
  DA: "#0d9488",
  DS: "#d97706",
  AI: "#6d28d9",
  UXR: "#db2777",
  UX: "#ea580c",
  UI: "#65a30d",
};

/** Fallback colors for roles from an uploaded catalog. */
const EXTRA_COLORS = ["#475569", "#0891b2", "#be123c", "#4d7c0f", "#7c3aed", "#b45309"];

export function roleColor(role: string, index: number): string {
  return ROLE_COLOR[role] ?? EXTRA_COLORS[index % EXTRA_COLORS.length];
}

export const FINDING_LABEL: Record<string, string> = {
  gap: "Gap WBS",
  overlap: "Tumpang tindih",
  outside_wbs: "Di luar WBS",
  divergence: "Selisih metode",
  data_quality: "Kualitas data",
  assumption: "Asumsi",
  reclassified: "Klasifikasi ulang",
};
