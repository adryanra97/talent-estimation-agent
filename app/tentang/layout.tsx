import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Kenapa TalentLens dibuat, cara kerja agent-nya, dan batasan yang perlu diketahui sebelum memakai hasilnya.",
  alternates: { canonical: "/tentang" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Tentang · TalentLens", description: "Kenapa TalentLens dibuat, cara kerja agent-nya, dan batasan yang perlu diketahui sebelum memakai hasilnya.", url: "/tentang" },
  twitter: { card: "summary_large_image", title: "Tentang · TalentLens", description: "Kenapa TalentLens dibuat, cara kerja agent-nya, dan batasan yang perlu diketahui sebelum memakai hasilnya." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
