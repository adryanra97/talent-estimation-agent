import type { Catalog, RunResult } from "./types";

export interface TeamGroup {
  key: string;
  label: string;
  roles: string[];
}

/** Group the roles of a run by catalog team, keeping the run's role order. */
export function teamGroups(run: RunResult, catalog: Catalog | null): TeamGroup[] {
  const groups = new Map<string, TeamGroup>();
  for (const role of run.roles) {
    const key = catalog?.roles[role]?.team ?? "other";
    const label = catalog?.teams[key]?.label ?? "Lainnya";
    if (!groups.has(key)) groups.set(key, { key, label, roles: [] });
    groups.get(key)!.roles.push(role);
  }
  return [...groups.values()];
}

/** Teams shown for the current filter. */
export function visibleGroups(run: RunResult, catalog: Catalog | null, view: string): TeamGroup[] {
  const groups = teamGroups(run, catalog);
  if (view === "all") return groups;
  const match = groups.filter((g) => g.key === view);
  return match.length ? match : groups;
}

export function visibleRoles(run: RunResult, catalog: Catalog | null, view: string): string[] {
  return visibleGroups(run, catalog, view).flatMap((g) => g.roles);
}
