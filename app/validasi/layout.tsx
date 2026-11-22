import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analisis baru",
  description: "Unggah WBS dan dokumen permintaan, lalu jalankan agent untuk menghitung kebutuhan talent per role.",
  alternates: { canonical: "/validasi" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Analisis baru · TalentLens", description: "Unggah WBS dan dokumen permintaan, lalu jalankan agent untuk menghitung kebutuhan talent per role.", url: "/validasi" },
  twitter: { card: "summary_large_image", title: "Analisis baru · TalentLens", description: "Unggah WBS dan dokumen permintaan, lalu jalankan agent untuk menghitung kebutuhan talent per role." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
