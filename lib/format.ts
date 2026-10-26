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
};

export const ROLE_COLOR: Record<string, string> = {
  DE: "#0284c7",
  DA: "#0d9488",
  DS: "#d97706",
  AI: "#6d28d9",
};

export const FINDING_LABEL: Record<string, string> = {
  gap: "Gap WBS",
  overlap: "Tumpang tindih",
  outside_wbs: "Di luar WBS",
  divergence: "Selisih metode",
  data_quality: "Kualitas data",
  assumption: "Asumsi",
  reclassified: "Klasifikasi ulang",
};
