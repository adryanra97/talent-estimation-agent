import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Atur model bahasa dan rate talent yang dipakai untuk estimasi biaya.",
  alternates: { canonical: "/pengaturan" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Pengaturan · TalentLens", description: "Atur model bahasa dan rate talent yang dipakai untuk estimasi biaya.", url: "/pengaturan" },
  twitter: { card: "summary_large_image", title: "Pengaturan · TalentLens", description: "Atur model bahasa dan rate talent yang dipakai untuk estimasi biaya." },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
