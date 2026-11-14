"use client";

import {
  BookOpen,
  CircleCheck,
  CircleDashed,
  Download,
  FilePlus2,
  Home,
  Info,
  Layers,
  GitBranch,
  Loader2,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { RESULT_LINKS } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Button } from "./ui";


function NavLink({
  href,
  label,
  icon,
  disabled,
  nested,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  if (disabled) {
    return (
      <span
        aria-disabled
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 ${nested ? "pl-9" : ""}`}
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${nested ? "pl-9" : ""} ${
        active ? "bg-accent-50 font-medium text-accent-700" : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Sidebar() {
  const { run, status } = useStore();
  const hasRun = Boolean(run);
  return (
    <aside className="tl-app-sidebar hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <Link href="/" className="tl-app-brand flex items-center gap-3 border-b border-line px-5 py-5">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-md bg-[#123b55] text-[#bce9f1]"><GitBranch size={18}/></span>
          <span className="flex flex-col"><strong className="text-[16px] font-bold leading-tight text-ink">TalentLens</strong><small className="mt-0.5 text-[10px] font-semibold tracking-[.08em] text-muted">CAPABILITY INTELLIGENCE</small></span>
        </Link>
        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLink href="/" label="Beranda" icon={<Home className="h-4 w-4" aria-hidden />} />
          <NavLink href="/validasi" label="Validasi Baru" icon={<FilePlus2 className="h-4 w-4" aria-hidden />} />
          <NavLink
            href="/proses"
            label="Proses"
            disabled={status === "idle" && !hasRun}
            icon={
              status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CircleDashed className="h-4 w-4" aria-hidden />
              )
            }
          />
          <div className="pt-2">
            <p className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted">
              <CircleCheck className="h-4 w-4" aria-hidden />
              Hasil
            </p>
            {RESULT_LINKS.map((link) => (
              <NavLink key={link.href} {...link} nested disabled={!hasRun} />
            ))}
          </div>
          <div className="space-y-1 border-t border-line pt-3">
            <NavLink href="/katalog" label="Katalog Capability" icon={<Layers className="h-4 w-4" aria-hidden />} />
            <NavLink href="/pengaturan" label="Pengaturan" icon={<Settings className="h-4 w-4" aria-hidden />} />
            <NavLink href="/metodologi" label="Metodologi" icon={<BookOpen className="h-4 w-4" aria-hidden />} />
            <NavLink href="/tentang" label="Tentang Aplikasi" icon={<Info className="h-4 w-4" aria-hidden />} />
          </div>
        </nav>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { run } = useStore();
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  const links = [
    { href: "/", label: "Beranda" },
    { href: "/validasi", label: "Validasi" },
    ...(run ? [{ href: "/hasil/ringkasan", label: "Hasil" }] : []),
    { href: "/katalog", label: "Katalog" },
    { href: "/pengaturan", label: "Pengaturan" },
    { href: "/metodologi", label: "Metodologi" },
    { href: "/tentang", label: "Tentang" },
  ];
  return (
    <nav ref={navRef} aria-label="Navigasi utama mobile" className="tl-mobile-nav flex gap-1 overflow-x-auto border-b border-line bg-surface px-4 py-2 lg:hidden">
      {links.map((l) => {
        const active = l.href === "/hasil/ringkasan" ? pathname.startsWith("/hasil/") : pathname === l.href;
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={`tl-mobile-navlink rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${active ? "is-active" : "text-muted hover:bg-canvas"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Header() {
  const pathname = usePathname();
  const { provider, apiKey, demo, run, exportExcel, busy } = useStore();
  const connected = Boolean(apiKey);
  const providerName: Record<string, string> = {
    google: "Gemini",
    anthropic: "Claude",
    openai: "OpenAI",
    azure: "Azure OpenAI",
    openai_compatible: "Endpoint kustom",
  };
  return (
    <header className="tl-app-header sticky top-0 z-10 flex min-h-14 items-center justify-between gap-4 border-b border-line bg-surface/95 px-6 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        {demo && run ? (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-900 ring-1 ring-amber-200">
            Data contoh
          </span>
        ) : null}
        <Link href="/pengaturan" className="flex items-center gap-2 truncate text-muted hover:text-ink">
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          {connected
            ? `${providerName[provider.provider]}, ${provider.model}`
            : "Model belum diatur"}
        </Link>
      </div>
      {run && !pathname.startsWith("/hasil") && (
        <Button size="sm" onClick={exportExcel} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          <span className="sm:hidden">Excel</span>
          <span className="hidden sm:inline">Unduh hasil Excel</span>
        </Button>
      )}
    </header>
  );
}

function Notice() {
  const { notice, setNotice } = useStore();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  if (!notice) return null;
  return (
    <div role="status" className="fixed right-6 bottom-6 z-30 flex max-w-sm items-start gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-lg">
      <span className="flex-1">{notice}</span>
      <button onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan" className="text-slate-300 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-line px-6 py-5 text-xs text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          Dibuat oleh <span className="font-medium text-ink">Adryan Rizky Alviano</span>
        </span>
        <span className="flex gap-4">
          <a href="https://adryanrizkyalviano.me/projects" className="hover:text-ink">
            Portfolio
          </a>
          <a href="https://github.com/adryanra97/talent-estimation-agent" className="hover:text-ink">
            GitHub
          </a>
          <span>Lisensi MIT</span>
        </span>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <MobileNav />
        <main className="tl-app-main mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <Footer />
      </div>
      <Notice />
    </div>
  );
}
