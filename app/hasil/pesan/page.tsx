"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { WithRun } from "@/components/result-guard";
import { Button, Card, PageHeader, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store";

function Editor({ initial }: { initial: string }) {
  const { run, setRun } = useStore();
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  useEffect(() => setText(initial), [initial]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card
      title="Draf pesan balasan"
      description="Disusun dari angka hasil hitung. Sunting sebelum dikirim."
      actions={
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Tersalin" : "Salin teks"}
        </Button>
      }
    >
      <textarea
        aria-label="Draf pesan"
        rows={18}
        className={`${inputClass} leading-relaxed`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => run && setRun({ ...run, message_draft: text })}
      />
    </Card>
  );
}

export default function MessagePage() {
  return (
    <WithRun>
      {(run) => (
        <>
          <PageHeader title="Draf komunikasi" description="Ringkasan tertulis untuk dibagikan kepada pemohon. Periksa isi dan angka, lalu salin bersama berkas Excel hasil analisis." />
          <div className="tl-report-writing-guide" aria-label="Langkah sebelum mengirim hasil">
            <div><strong>01 / VERIFIKASI</strong><p>Pastikan angka dan status review sesuai dengan ringkasan final.</p></div>
            <div><strong>02 / SESUAIKAN NARASI</strong><p>Sunting konteks proyek serta rekomendasi tanpa mengubah bukti perhitungan.</p></div>
            <div><strong>03 / KIRIM BERSAMA DATA</strong><p>Salin pesan dan lampirkan hasil Excel agar penerima dapat menelusuri setiap angka.</p></div>
          </div>
          <Editor initial={run.message_draft} />
        </>
      )}
    </WithRun>
  );
}
