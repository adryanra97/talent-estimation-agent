"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESULT_LINKS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { ResultsShell } from "@/components/results-shell";
import "@/app/hasil/report.css";

export function ResultLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { run } = useStore();
  const index = RESULT_LINKS.findIndex((item) => item.href === pathname);
  const previous = index > 0 ? RESULT_LINKS[index - 1] : null;
  const next = index >= 0 && index < RESULT_LINKS.length - 1 ? RESULT_LINKS[index + 1] : null;
  return (
    <ResultsShell>
      {children}
      {run && index >= 0 && (
        <nav className="tl-report-pager" aria-label="Halaman hasil sebelum dan sesudahnya">
          {previous ? (
            <Link href={previous.href} className="tl-report-pager-link">
              <ArrowLeft size={18} aria-hidden />
              <span><small>SEBELUMNYA</small><strong>{previous.label}</strong></span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={next.href} className="tl-report-pager-link is-next">
              <span><small>SELANJUTNYA</small><strong>{next.label}</strong></span>
              <ArrowRight size={18} aria-hidden />
            </Link>
          ) : <span />}
        </nav>
      )}
    </ResultsShell>
  );
}
