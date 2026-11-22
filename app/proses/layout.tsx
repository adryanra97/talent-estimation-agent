import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivitas agent",
  description: "Pantau agent saat membaca WBS, mengklasifikasi item, dan menghitung kebutuhan talent.",
  alternates: { canonical: "/proses" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Aktivitas agent · TalentLens", description: "Pantau agent saat membaca WBS, mengklasifikasi item, dan menghitung kebutuhan talent.", url: "/proses" },
  twitter: { card: "summary_large_image", title: "Aktivitas agent · TalentLens", description: "Pantau agent saat membaca WBS, mengklasifikasi item, dan menghitung kebutuhan talent." },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
