import { Card, PageHeader } from "@/components/ui";

export default function MethodPage() {
  return (
    <>
      <PageHeader
        title="Metodologi"
        description="Cara agent menilai dan cara sistem menghitung. Prinsipnya: model menilai dan menjelaskan, kode menghitung."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Use Case Points (UCP)">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
            <li>Setiap item WBS untuk setiap role diberi kelas: Simple (bobot 5), Average (10), atau Complex (15), berdasarkan jumlah langkah pekerjaan.</li>
            <li>Item di mana role hanya mendukung dihitung sebagian (bawaan 25%).</li>
            <li>Ditambah bobot aktor: pihak di luar role yang berinteraksi (sumber data, sistem lain, pengguna).</li>
            <li>Disesuaikan dengan faktor teknis (TCF) dan faktor lingkungan tim (EF). Rating bawaan 3 dan hanya diubah dengan bukti.</li>
            <li>Poin dikali PHM (jam per poin), dibagi jam per hari, hari per bulan, dan durasi proyek, menjadi FTE rata-rata.</li>
          </ol>
          <p className="mt-3 text-xs text-muted">Karner, G. (1993). Resource estimation for objectory projects.</p>
        </Card>
        <Card title="Bottom-up">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
            <li>Hari kerja tiap item diambil dari jadwal WBS.</li>
            <li>Agent memperkirakan alokasi FTE yang wajar untuk bebannya, mengikuti panduan alokasi, bukan menyalin jumlah orang yang diminta.</li>
            <li>Person-days = hari kerja x alokasi x jumlah. Dijumlahkan per role lalu diubah menjadi FTE.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">Dua metode dihitung terpisah. Bila hasilnya sepakat, angkanya lebih dapat dipercaya; bila berbeda, Reviewer Agent memeriksa barisnya.</p>
        </Card>
        <Card title="Membaca hasil">
          <ul className="space-y-2 text-sm text-ink">
            <li><span className="font-medium">FTE rata-rata</span> menggambarkan beban sepanjang periode. <span className="font-medium">FTE puncak</span> adalah bulan tersibuk.</li>
            <li><span className="font-medium">Kebutuhan tambahan</span> = kebutuhan total dikurangi talent existing. Inilah yang dibandingkan dengan permintaan.</li>
            <li><span className="font-medium">Selaras</span> berarti selisih dengan permintaan berada dalam toleransi (bawaan ±15%).</li>
          </ul>
        </Card>
        <Card title="Skenario bantuan AI">
          <ul className="space-y-2 text-sm text-ink">
            <li>Augmentation Agent mengurai tiap baris menjadi tugas dan memetakannya ke pilar skill.</li>
            <li>Setiap tugas masuk satu kategori tertutup dengan rentang hemat yang konservatif. Persentase berasal dari tabel, bukan dari model.</li>
            <li>Hasilnya skenario: angka dasar tidak berubah. AI mempercepat tugas tertentu, tanggung jawab peran tetap pada talent.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
