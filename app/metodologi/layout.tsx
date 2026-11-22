import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologi",
  description: "Cara TalentLens menghitung kebutuhan talent dengan Use Case Points dan bottom-up, dan cara membaca selisih di antara keduanya.",
  alternates: { canonical: "/metodologi" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Metodologi · TalentLens", description: "Cara TalentLens menghitung kebutuhan talent dengan Use Case Points dan bottom-up, dan cara membaca selisih di antara keduanya.", url: "/metodologi" },
  twitter: { card: "summary_large_image", title: "Metodologi · TalentLens", description: "Cara TalentLens menghitung kebutuhan talent dengan Use Case Points dan bottom-up, dan cara membaca selisih di antara keduanya." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
