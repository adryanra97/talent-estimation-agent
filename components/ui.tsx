"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { ROLE_STYLE } from "@/lib/format";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-accent-600 text-white hover:bg-accent-700",
    secondary: "border border-line bg-white text-ink hover:bg-canvas",
    ghost: "text-muted hover:bg-canvas hover:text-ink",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Info aria-hidden className="h-3.5 w-3.5 text-muted" />
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs leading-relaxed font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function Field({
  label,
  hint,
  tip,
  error,
  children,
}: {
  label: string;
  hint?: string;
  tip?: string;
  error?: string | null;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {label}
        {tip && <InfoTip text={tip} />}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export const inputBase =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 disabled:bg-canvas";

export const inputClass = `${inputBase} w-full`;

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-accent-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function RoleBadge({ role, name }: { role: string; name?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_STYLE[role] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}
      title={name}
    >
      {role}
      {name && <span className="font-normal">{name}</span>}
    </span>
  );
}

export function StatusBadge({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral" | "accent"; children: React.ReactNode }) {
  const tones = {
    good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
    bad: "bg-red-50 text-red-800 ring-red-200",
    neutral: "bg-slate-50 text-slate-700 ring-slate-200",
    accent: "bg-accent-50 text-accent-700 ring-accent-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
      >
        {action}
      </Link>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
