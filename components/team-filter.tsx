"use client";

import { useStore } from "@/lib/store";
import { teamGroups } from "@/lib/teams";
import type { RunResult } from "@/lib/types";

/**
 * Segmented control that narrows every result page to one team.
 * The choice is shared across pages, so switching menu keeps the same view.
 * Hidden when the run has only one team.
 */
export function TeamFilter({ run }: { run: RunResult }) {
  const { catalog, teamView, setTeamView } = useStore();
  const groups = teamGroups(run, catalog);
  if (groups.length < 2) return null;
  const options = [{ key: "all", label: "Semua tim", count: run.roles.length }, ...groups.map((g) => ({ ...g, count: g.roles.length }))];
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas p-1" role="group" aria-label="Tampilkan tim">
      {options.map((o) => (
        <button
          key={o.key}
          aria-pressed={teamView === o.key}
          onClick={() => setTeamView(o.key)}
          className={`rounded-md px-3 py-1.5 text-sm ${teamView === o.key ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label} <span className="tabular text-xs text-muted">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
