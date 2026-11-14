import { ArrowRight, CheckCircle2, GitCompareArrows, ScanSearch } from "lucide-react";
import Link from "next/link";
import { ResourceHeading, ResourceHero } from "@/components/resource-page";

const UCP_STEPS = [
  ["01", "Klasifikasi", "Setiap item WBS × role diklasifikasikan sebagai Simple (5), Average (10), atau Complex (15). Peran pendukung diberi bobot sebagian sesuai parameter."],
  ["02", "Bobot aktor", "Sistem atau pihak yang berinteraksi dengan pekerjaan diperhitungkan sebagai Unadjusted Actor Weight (UAW)."],
  ["03", "Faktor penyesuaian", "Technical Complexity Factor (TCF) dan Environmental Factor (EF) diterapkan berdasarkan penilaian yang mempunyai dasar."],
  ["04", "Konversi ke FTE", "UCP dikalikan PHM (jam per poin) lalu dikonversi ke kapasitas kerja berdasarkan jam/hari, hari/bulan, dan durasi analisis."],
];

const BU_STEPS = [
  ["01", "Baca jadwal", "Tanggal mulai dan selesai setiap item pada WBS menentukan hari kerja."],
  ["02", "Taksir alokasi", "Estimator menilai alokasi FTE sesuai beban kerja, role, dan jumlah pekerjaan; bukan menyalin jumlah talent yang diminta."],
  ["03", "Hitung person-days", "Effort = hari kerja × alokasi FTE × kuantitas. Seluruh item pada role yang sama dijumlahkan."],
  ["04", "Konversi ke FTE", "Total person-days dibandingkan dengan kapasitas hari kerja selama durasi proyek untuk mendapatkan FTE rata-rata."],
];

export default function MethodPage() {
  return (
    <div className="tl-resource-page tl-method-page">
      <ResourceHero eyebrow="METHODOLOGY / TRANSPARENT ESTIMATION"
        title="Cara angka dihitung." accent="Tanpa black box."
        chapter="METHOD / 03"
        description="TalentLens menggunakan dua pendekatan estimasi yang dihitung terpisah. Agent membantu menilai konteks pekerjaan; mesin hitung menghasilkan angka yang bisa diaudit."
        actions={<Link href="/hasil/ringkasan">Buka hasil analisis <ArrowRight size={16} aria-hidden /></Link>}
      />
      <div className="tl-resource-body">
        <div className="tl-resource-notice">
          <ScanSearch size={19} className="shrink-0 mt-0.5" aria-hidden />
          <div><strong>Prinsip dasar:</strong> model bahasa memilih klasifikasi dan memberikan alasan yang dapat ditinjau; rumus UCP, bottom-up, dan FTE dijalankan oleh kode. Parameter dapat dikaji di halaman Validasi Baru.</div>
        </div>

        <ResourceHeading index="01" label="TWO INDEPENDENT ESTIMATES"
          title="Satu WBS, dua sudut pandang."
          description="UCP memberi ukuran kompleksitas. Bottom-up menghitung langsung effort berdasarkan jadwal dan alokasi. Perbedaan hasil adalah sinyal untuk membaca evidence lebih lanjut." />
        <div className="tl-method-grid">
          <section className="tl-method-panel" aria-labelledby="ucp-heading">
            <p className="tl-method-panel-index">METHOD 01 / COMPLEXITY BASED</p>
            <h3 id="ucp-heading">Use Case Points</h3>
            <p>Estimasi beban kerja berdasarkan kelas pekerjaan, interaksi aktor, dan faktor teknis serta lingkungan.</p>
            <div className="tl-method-equation" role="group" aria-label="Rumus UCP">
              UCP = (UAW + UUCW) × TCF × EF
              <span className="block mt-1 text-xs font-normal text-muted">Jam estimasi = UCP × PHM</span>
            </div>
            <ol className="tl-method-steps">
              {UCP_STEPS.map(([number, title, text]) => (
                <li key={number}>
                  <strong aria-hidden>{number}</strong>
                  <div><b className="text-ink">{title}.</b> {text}</div>
                </li>
              ))}
            </ol>
            <p className="tl-resource-note">Acuan pendekatan UCP: Gustav Karner (1993). Bobot dan parameter yang digunakan dalam aplikasi dapat dikonfigurasi.</p>
          </section>

          <section className="tl-method-panel" aria-labelledby="bu-heading">
            <p className="tl-method-panel-index">METHOD 02 / ACTIVITY BASED</p>
            <h3 id="bu-heading">Bottom-up</h3>
            <p>Estimasi effort setiap aktivitas WBS melalui durasi pekerjaan, alokasi tenaga, dan kuantitasnya.</p>
            <div className="tl-method-equation" role="group" aria-label="Rumus bottom-up">
              Person-days = hari kerja × alokasi FTE × qty
              <span className="block mt-1 text-xs font-normal text-muted">FTE rata-rata = person-days ÷ kapasitas hari kerja proyek</span>
            </div>
            <ol className="tl-method-steps">
              {BU_STEPS.map(([number, title, text]) => (
                <li key={number}>
                  <strong aria-hidden>{number}</strong>
                  <div><b className="text-ink">{title}.</b> {text}</div>
                </li>
              ))}
            </ol>
            <p className="tl-resource-note">Contoh ilustratif: sebuah item selama 10 hari kerja dengan alokasi 0,5 FTE dan qty 1 setara 5 person-days.</p>
          </section>
        </div>

        <ResourceHeading index="02" label="INTERPRETING THE RESULTS"
          title="Cara membaca rekomendasi."
          description="Tiga angka ini menjawab pertanyaan yang berbeda. Dengan membedakannya, keputusan staffing lebih mudah dijelaskan." />
        <div className="tl-method-concepts">
          <div>
            <h3>FTE rata-rata</h3>
            <p>Rata-rata kebutuhan selama periode proyek. Cocok untuk memperkirakan kapasitas talent sepanjang durasi analisis.</p>
          </div>
          <div>
            <h3>FTE puncak</h3>
            <p>Kebutuhan pada bulan tersibuk. Gunakan untuk mengidentifikasi risiko kekurangan kapasitas di periode tertentu.</p>
          </div>
          <div>
            <h3>Kebutuhan tambahan</h3>
            <p>Kebutuhan total dikurangi talent existing, dengan batas minimum nol. Angka tambahan inilah yang dibandingkan dengan permintaan.</p>
          </div>
        </div>

        <div className="tl-method-checklist" aria-label="Checklist review hasil">
          <div>
            <p className="tl-resource-eyebrow">HUMAN IN THE LOOP / 03</p>
            <h2>Ketika dua metode berbeda, apa berikutnya?</h2>
            <p>Reviewer Agent memeriksa selisih, kualitas data, dan kemungkinan ketidaksesuaian klasifikasi. Hasilnya dapat ditinjau serta dikoreksi manusia sebelum keputusan final.</p>
            <Link className="tl-resource-action-link" href="/hasil/temuan">Lihat temuan dan asumsi <ArrowRight size={15} aria-hidden /></Link>
          </div>
          <ol>
            <li><CheckCircle2 size={17} aria-hidden /><span>Periksa item WBS yang ditandai perlu review.</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Bandingkan kebutuhan tambahan dengan jumlah yang diminta.</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Validasi kesimpulan terhadap kapasitas per bulan.</span></li>
            <li><CheckCircle2 size={17} aria-hidden /><span>Setujui hasil setelah alasan dan asumsi dipahami.</span></li>
          </ol>
        </div>

        <ResourceHeading index="04" label="AI AUGMENTATION"
          title="Efisiensi AI dihitung sebagai skenario."
          description="Augmentation Agent memetakan tugas yang berpotensi terbantu oleh AI ke kategori skill, lalu menggunakan asumsi persentase penghematan per kategori." />
        <div className="tl-method-augmentation">
          <div className="tl-method-augmentation-symbol"><GitCompareArrows size={24} aria-hidden /></div>
          <div>
            <h3>Baseline tetap dipertahankan.</h3>
            <p>Nilai FTE awal dari UCP dan bottom-up tidak diubah. Skenario AI ditampilkan terpisah untuk memudahkan perbandingan dan review. Tugas yang melibatkan keputusan serta tanggung jawab manusia tetap memerlukan pengawasan talent.</p>
          </div>
          <Link className="tl-resource-action-link" href="/hasil/peluang-ai">Buka skenario AI <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <p className="tl-resource-note mt-6">Lihat juga <Link href="/katalog" className="underline text-accent-700">Katalog Capability</Link> untuk memahami role dan pilar skill yang menjadi dasar klasifikasi.</p>
      </div>
    </div>
  );
}
