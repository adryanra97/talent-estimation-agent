import type { Comparison, RateLevel, RateTable, RunResult } from "./types";

export type CostBasis = "employee" | "vendor";
export type CostMethod = "ucp" | "bu";

/** How FTE is priced. Sent to the API so the Excel Biaya sheet matches the page. */
export interface CostSettings {
  levels: Record<string, RateLevel>;
  basis: CostBasis;
  method: CostMethod;
}

export const DEFAULT_COST_SETTINGS: CostSettings = { levels: {}, basis: "employee", method: "bu" };

export interface RoleCost {
  role: string;
  level: RateLevel;
  salary: number; // million rupiah, median of the level range
  multiplier: number;
  perFte: number; // rupiah per month for one FTE
  requestedFte: number | null;
  computedFte: number;
  requestedMonthly: number | null;
  computedMonthly: number;
  gapMonthly: number | null; // requested minus computed
  gapPeriod: number | null;
  assistedFte: number | null;
  assistedMonthly: number | null;
  potentialMonthly: number | null;
  potentialPeriod: number | null;
}

export function multiplierFor(rates: RateTable, basis: CostBasis): number {
  return basis === "vendor" ? rates.vendor_multiplier : rates.employer_multiplier;
}

/** Monthly cost per role and the gap between what was requested and what was computed. */
export function roleCosts(run: RunResult, rows: Comparison[], rates: RateTable, settings: CostSettings): RoleCost[] {
  const months = Math.max(1, run.monthly.length);
  const multiplier = multiplierFor(rates, settings.basis);
  const aiByRole = new Map(run.ai_enabled ? run.ai_summary.map((item) => [item.role, item]) : []);
  return rows.map((c) => {
    const level = settings.levels[c.role] ?? "M";
    const range = rates.roles[c.role]?.[level] ?? [0, 0];
    const salary = (range[0] + range[1]) / 2;
    const perFte = salary * multiplier * 1_000_000;
    const computedFte = settings.method === "ucp" ? c.ucp_fte : c.bu_fte;
    const requestedMonthly = c.requested_fte === null ? null : c.requested_fte * perFte;
    const computedMonthly = computedFte * perFte;
    const gapMonthly = requestedMonthly === null ? null : requestedMonthly - computedMonthly;
    const assessment = aiByRole.get(c.role);
    const proposedFte = settings.method === "ucp" ? assessment?.ucp_fte_assisted : assessment?.bu_fte_assisted;
    // AI estimates represent assisted effort, not an automatic headcount or budget cut.
    const assistedFte = typeof proposedFte === "number" && Number.isFinite(proposedFte)
      ? Math.max(0, Math.min(computedFte, proposedFte)) : null;
    const assistedMonthly = assistedFte === null ? null : assistedFte * perFte;
    const potentialMonthly = assistedMonthly === null ? null : computedMonthly - assistedMonthly;
    return {
      role: c.role, level, salary, multiplier, perFte,
      requestedFte: c.requested_fte, computedFte,
      requestedMonthly, computedMonthly, gapMonthly,
      gapPeriod: gapMonthly === null ? null : gapMonthly * months,
      assistedFte, assistedMonthly, potentialMonthly,
      potentialPeriod: potentialMonthly === null ? null : potentialMonthly * months,
    };
  });
}

/** Rupiah in short Indonesian form: Rp850 rb, Rp25,7 jt, Rp1,2 M. */
export function rupiah(value: number | null | undefined, signed = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  const abs = Math.abs(value);
  const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${sign}Rp${fmt(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}Rp${fmt(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}Rp${fmt(abs / 1e3)} rb`;
  return `${sign}Rp${fmt(abs)}`;
}
