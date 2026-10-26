"use client";

import { useStore } from "@/lib/store";
import type { RunResult } from "@/lib/types";
import { EmptyState } from "./ui";

export function WithRun({ children }: { children: (run: RunResult) => React.ReactNode }) {
  const { run } = useStore();
  if (!run) {
    return (
      <EmptyState
        title="Belum ada hasil"
        description="Hasil muncul setelah validasi selesai. Mulai dari halaman Validasi Baru atau coba mode demo."
        href="/"
        action="Ke Validasi Baru"
      />
    );
  }
  return <>{children(run)}</>;
}

export function roleName(code: string, names: Record<string, { name: string }> | undefined): string {
  return names?.[code]?.name ?? code;
}
