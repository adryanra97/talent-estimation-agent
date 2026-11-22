import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog role dan skill",
  description: "Daftar role, skill, dan skala kompetensi yang dipakai TalentLens untuk memetakan pekerjaan di WBS.",
  alternates: { canonical: "/katalog" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Katalog role dan skill · TalentLens", description: "Daftar role, skill, dan skala kompetensi yang dipakai TalentLens untuk memetakan pekerjaan di WBS.", url: "/katalog" },
  twitter: { card: "summary_large_image", title: "Katalog role dan skill · TalentLens", description: "Daftar role, skill, dan skala kompetensi yang dipakai TalentLens untuk memetakan pekerjaan di WBS." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
