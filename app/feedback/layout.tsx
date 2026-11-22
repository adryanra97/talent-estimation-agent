import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Masukan pengguna atas hasil analisis. Agent memeriksa setiap masukan dan admin memutuskan apakah prompt diperbarui.",
  alternates: { canonical: "/feedback" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Feedback · TalentLens", description: "Masukan pengguna atas hasil analisis. Agent memeriksa setiap masukan dan admin memutuskan apakah prompt diperbarui.", url: "/feedback" },
  twitter: { card: "summary_large_image", title: "Feedback · TalentLens", description: "Masukan pengguna atas hasil analisis. Agent memeriksa setiap masukan dan admin memutuskan apakah prompt diperbarui." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
