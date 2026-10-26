"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Side panel for details on demand. Built on the native dialog element, so
 * focus stays inside while open and Escape closes it.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/30 open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Tutup">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
