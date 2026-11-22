import type { Metadata } from "next";
import { ResultLayout } from "@/components/result-layout";

export const metadata: Metadata = {
  title: "Hasil analisis",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ResultLayout>{children}</ResultLayout>;
}
