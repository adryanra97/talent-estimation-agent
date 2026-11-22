import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk dengan akun demo untuk memberi atau meninjau feedback.",
  alternates: { canonical: "/masuk" },
  openGraph: { type: "website", locale: "id_ID", siteName: "TalentLens", title: "Masuk · TalentLens", description: "Masuk dengan akun demo untuk memberi atau meninjau feedback.", url: "/masuk" },
  twitter: { card: "summary_large_image", title: "Masuk · TalentLens", description: "Masuk dengan akun demo untuk memberi atau meninjau feedback." },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
