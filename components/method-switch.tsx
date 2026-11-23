"use client";

import Link from "next/link";
import type { CostMethod } from "@/lib/cost";
import { useStore } from "@/lib/store";

const NAME: Record<CostMethod, string> = { bu: "Bottom-up", ucp: "UCP" };

/** Method toggle shared by every results page, so a choice made on one page holds on the others. */
export function MethodSwitch() {
  const { costSettings, setCostSettings } = useStore();
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas p-1" role="group" aria-label="Metode hitung FTE">
      {(["bu", "ucp"] as CostMethod[]).map((m) => (
        <button key={m} type="button" aria-pressed={costSettings.method === m}
          onClick={() => setCostSettings({ ...costSettings, method: m })}
          className={`rounded-md px-3 py-1.5 text-sm ${costSettings.method === m ? "bg-white font-medium text-accent-700 shadow-sm" : "text-muted hover:text-ink"}`}>
          {NAME[m]}
        </button>
      ))}
    </div>
  );
}

/** One-line definition of both methods, shown wherever the toggle changes the numbers. */
export function MethodNote() {
  const { costSettings } = useStore();
  return (
    <p className="tl-method-note">
      Angka di halaman ini memakai <strong>{NAME[costSettings.method]}</strong>.{" "}
      Bottom-up menjumlahkan effort tiap item WBS, sedangkan UCP menghitung dari tingkat kompleksitas pekerjaan.
      Kalau hasil keduanya jauh berbeda, item terkait biasanya muncul di Perlu review.{" "}
      <Link href="/metodologi#dua-metode">Bandingkan kedua metode</Link>
    </p>
  );
}
