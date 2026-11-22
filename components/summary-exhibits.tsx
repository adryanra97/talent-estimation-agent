"use client";

import { useEffect, useRef, useState } from "react";
import { fte, month } from "@/lib/format";
import type { CostMethod } from "@/lib/cost";
import type { Comparison, MonthlyFte } from "@/lib/types";
import "./summary-exhibits.css";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Counts from 0 to `value` once the element is on screen. */
export function useCountUp(value: number, duration = 900): [number, React.RefObject<HTMLElement | null>] {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(frame);
    }
    setShown(0);
    const io = new IntersectionObserver((entries) => {
      if (!started && entries.some((e) => e.isIntersecting)) {
        started = true;
        run();
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);
  return [shown, ref];
}

export interface Totals {
  need: number;
  additional: number;
  existing: number;
  requested: number;
  hasRequested: boolean;
  other: number;
}

export function totals(rows: Comparison[], method: CostMethod): Totals {
  const withRequest = rows.filter((c) => c.requested_fte !== null);
  return {
    need: rows.reduce((a, c) => a + (method === "ucp" ? c.ucp_fte : c.bu_fte), 0),
    additional: withRequest.reduce((a, c) => a + (method === "ucp" ? c.ucp_additional_fte : c.bu_additional_fte), 0),
    existing: withRequest.reduce((a, c) => a + c.existing_fte, 0),
    requested: withRequest.reduce((a, c) => a + (c.requested_fte ?? 0), 0),
    hasRequested: withRequest.length > 0,
    other: rows.reduce((a, c) => a + (method === "ucp" ? c.bu_fte : c.ucp_fte), 0),
  };
}

const METHOD_NAME: Record<CostMethod, string> = { bu: "bottom-up", ucp: "UCP" };

export function ExecutiveHero({ t, method, onMethod, review, roles }: {
  t: Totals; method: CostMethod; onMethod: (m: CostMethod) => void; review: number; roles: number;
}) {
  const gap = t.requested - t.additional;
  const over = gap > 0.05;
  const under = gap < -0.05;
  const headline = !t.hasRequested
    ? { value: t.need, unit: "FTE", lead: "Kebutuhan hasil hitung", tail: "Isi FTE yang diminta agar permintaan bisa diuji." }
    : over
      ? { value: gap, unit: "FTE", lead: "Permintaan di atas kebutuhan", tail: `Tribe meminta ${fte(t.requested)} FTE, sedangkan pekerjaan di WBS membutuhkan ${fte(t.additional)} FTE tambahan.` }
      : under
        ? { value: -gap, unit: "FTE", lead: "Permintaan di bawah kebutuhan", tail: `Tribe meminta ${fte(t.requested)} FTE, sedangkan pekerjaan di WBS membutuhkan ${fte(t.additional)} FTE tambahan.` }
        : { value: t.requested, unit: "FTE", lead: "Permintaan selaras dengan kebutuhan", tail: `Selisih kurang dari 0,05 FTE terhadap ${fte(t.additional)} FTE tambahan.` };
  const [n, ref] = useCountUp(headline.value);
  const tone = !t.hasRequested ? "is-neutral" : over ? "is-over" : under ? "is-under" : "is-fit";

  return (
    <section className={`tl-exec ${tone}`} aria-labelledby="tl-exec-title">
      <div className="tl-exec-main">
        <p className="tl-exec-kicker">Kesimpulan · {roles} role · metode {METHOD_NAME[method]}</p>
        <h2 id="tl-exec-title" className="tl-exec-lead">{headline.lead}</h2>
        <p className="tl-exec-figure" aria-label={`${fte(headline.value)} ${headline.unit}`}>
          <span ref={ref as React.RefObject<HTMLSpanElement>} aria-hidden>{fte(n)}</span>
          <small aria-hidden>{headline.unit}</small>
        </p>
        <p className="tl-exec-tail">{headline.tail}</p>
      </div>
      <aside className="tl-exec-side" aria-label="Konteks keputusan">
        <div className="tl-exec-switch" role="group" aria-label="Metode untuk angka di halaman ini">
          {(["bu", "ucp"] as CostMethod[]).map((m) => (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => onMethod(m)}>{m === "bu" ? "Bottom-up" : "UCP"}</button>
          ))}
        </div>
        <dl>
          <div><dt>Diminta</dt><dd>{t.hasRequested ? `${fte(t.requested)} FTE` : "—"}</dd></div>
          <div><dt>Talent tersedia</dt><dd>{fte(t.existing)} FTE</dd></div>
          <div><dt>Kebutuhan tambahan</dt><dd>{fte(t.additional)} FTE</dd></div>
          <div><dt>Metode lain ({METHOD_NAME[method === "bu" ? "ucp" : "bu"]})</dt><dd>{fte(t.other)} FTE total</dd></div>
        </dl>
        <p className={`tl-exec-review ${review ? "has-review" : ""}`}>
          {review ? `${review} baris WBS perlu ditinjau sebelum angka ini dipakai.` : "Tidak ada baris yang ditandai untuk ditinjau."}
        </p>
      </aside>
    </section>
  );
}

export function Exhibit({ n, title, children, source, id }: {
  n: number; title: string; children: React.ReactNode; source: string; id: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure ref={ref} className="tl-exhibit" data-in={seen ? "" : undefined} aria-labelledby={id}>
      <figcaption>
        <span className="tl-exhibit-no">Exhibit {n}</span>
        <h2 id={id}>{title}</h2>
      </figcaption>
      {children}
      <p className="tl-exhibit-source">{source}</p>
    </figure>
  );
}

type Step = { label: string; value: number; from: number; to: number; kind: "total" | "down" | "up" | "gap-over" | "gap-under"; note?: string };

export function Waterfall({ t, method }: { t: Totals; method: CostMethod }) {
  const steps: Step[] = [
    { label: "Kebutuhan dihitung", value: t.need, from: 0, to: t.need, kind: "total", note: METHOD_NAME[method] },
    { label: "Dipenuhi talent tersedia", value: t.need - t.additional, from: t.additional, to: t.need, kind: "down" },
    { label: "Kebutuhan tambahan", value: t.additional, from: 0, to: t.additional, kind: "total" },
  ];
  if (t.hasRequested) {
    const gap = t.requested - t.additional;
    steps.push({ label: gap >= 0 ? "Permintaan berlebih" : "Kekurangan permintaan", value: Math.abs(gap), from: Math.min(t.additional, t.requested), to: Math.max(t.additional, t.requested), kind: gap >= 0 ? "gap-over" : "gap-under" });
    steps.push({ label: "Diminta Tribe", value: t.requested, from: 0, to: t.requested, kind: "total" });
  }
  const max = Math.max(0.1, ...steps.map((s) => s.to)) * 1.12;
  const desc = steps.map((s) => `${s.label} ${fte(s.value)} FTE`).join(", ");

  return (
    <div className="tl-wf" role="img" aria-label={`Grafik air terjun: ${desc}.`}>
      <div className="tl-wf-plot" style={{ ["--cols" as string]: steps.length }}>
        {steps.map((s, i) => (
          <div key={s.label} className={`tl-wf-col is-${s.kind}`} style={{ ["--i" as string]: i }}>
            <div className="tl-wf-area">
              <span className="tl-wf-value" style={{ ["--at" as string]: `${(s.to / max) * 100}%` }}>
                {s.kind === "down" ? "−" : s.kind === "gap-over" ? "+" : s.kind === "gap-under" ? "−" : ""}{fte(s.value)}
              </span>
              <span className="tl-wf-bar" style={{ ["--from" as string]: `${(s.from / max) * 100}%`, ["--size" as string]: `${Math.max(0.6, ((s.to - s.from) / max) * 100)}%` }} />
              {i < steps.length - 1 && <span className="tl-wf-link" style={{ ["--at" as string]: `${((s.kind === "down" ? s.from : s.to) / max) * 100}%` }} />}
            </div>
            <p className="tl-wf-label">{s.label}{s.note && <small>{s.note}</small>}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyLine({ monthly, roles, method, reference, referenceLabel }: {
  monthly: MonthlyFte[]; roles: string[]; method: CostMethod; reference: number | null; referenceLabel: string;
}) {
  const points = monthly.map((m) => {
    const src = method === "ucp" ? m.ucp : m.bottom_up;
    return { month: m.month, value: roles.reduce((a, r) => a + (src[r] ?? 0), 0) };
  });
  if (points.length === 0) return <p className="tl-exhibit-empty">Belum ada data bulanan.</p>;
  const max = Math.max(0.1, reference ?? 0, ...points.map((p) => p.value)) * 1.18;
  const n = points.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;
  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const peak = points[peakIndex];
  const above = reference !== null ? points.filter((p) => p.value > reference).length : 0;
  const desc = points.map((p) => `${month(p.month)} ${fte(p.value)}`).join(", ");

  return (
    <div className="tl-ml" role="img" aria-label={`Kebutuhan FTE per bulan (${METHOD_NAME[method]}): ${desc}.${reference !== null ? ` ${referenceLabel} ${fte(reference)} FTE.` : ""}`}>
      <div className="tl-ml-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
          <path d={area} className="tl-ml-area" />
          <path d={line} className="tl-ml-line" pathLength={1} />
          {reference !== null && <line x1="0" x2="100" y1={y(reference)} y2={y(reference)} className="tl-ml-ref" />}
        </svg>
        {points.map((p, i) => (
          <span key={p.month} className={`tl-ml-dot ${i === peakIndex ? "is-peak" : ""}`} style={{ left: `${x(i)}%`, top: `${y(p.value)}%` }} aria-hidden />
        ))}
        {reference !== null && (
          <span className="tl-ml-ref-label" style={{ top: `${y(reference)}%` }} aria-hidden>{referenceLabel} · {fte(reference)}</span>
        )}
        <span className={`tl-ml-callout ${x(peakIndex) > 60 ? "is-left" : ""}`} style={{ left: `${x(peakIndex)}%`, top: `${y(peak.value)}%` }} aria-hidden>
          <strong>Puncak {fte(peak.value)} FTE</strong>
          <small>{month(peak.month)}</small>
        </span>
      </div>
      <div className="tl-ml-axis" aria-hidden>
        {points.map((p, i) => <span key={p.month} style={{ left: `${x(i)}%` }}>{month(p.month)}</span>)}
      </div>
      {reference !== null && (
        <p className="tl-ml-note">
          {above > 0 ? `${above} dari ${n} bulan melewati ${referenceLabel.toLowerCase()}.` : `Tidak ada bulan yang melewati ${referenceLabel.toLowerCase()}.`}
        </p>
      )}
    </div>
  );
}
