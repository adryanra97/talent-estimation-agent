"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { RESULT_LINKS } from "@/lib/nav";
import { useStore } from "@/lib/store";

/**
 * Shared frame for the result pages: a section strip on small screens, where
 * the sidebar is hidden, and previous/next links at the bottom of every page.
 */
export default function ResultLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { run } = useStore();
  const strip = useRef<HTMLUListElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  const index = RESULT_LINKS.findIndex((l) => l.href === pathname);
  const previous = index > 0 ? RESULT_LINKS[index - 1] : null;
  const next = index >= 0 && index < RESULT_LINKS.length - 1 ? RESULT_LINKS[index + 1] : null;

  return (
    <>
      {run && (
        <nav aria-label="Bagian hasil" className="-mx-6 -mt-4 mb-6 overflow-x-auto border-b border-line px-6 lg:hidden">
          <ul ref={strip} className="flex gap-1 pb-2">
            {RESULT_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.href === pathname ? "page" : undefined}
                  className={`block rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
                    l.href === pathname ? "bg-accent-50 font-medium text-accent-700" : "text-muted hover:bg-canvas"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
      {run && index >= 0 && (
        <nav aria-label="Halaman hasil sebelum dan sesudahnya" className="mt-10 grid grid-cols-2 gap-3 border-t border-line pt-6">
          {previous ? (
            <Link href={previous.href} className="group flex items-center gap-2 rounded-lg p-3 text-sm hover:bg-surface">
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted group-hover:text-ink" aria-hidden />
              <span>
                <span className="block text-xs text-muted">Sebelumnya</span>
                <span className="font-medium text-ink">{previous.label}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href} className="group flex items-center justify-end gap-2 rounded-lg p-3 text-right text-sm hover:bg-surface">
              <span>
                <span className="block text-xs text-muted">Berikutnya</span>
                <span className="font-medium text-ink">{next.label}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-ink" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
