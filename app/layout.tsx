import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { StoreProvider } from "@/lib/store";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://talentlens.adryanrizkyalviano.me"),
  title: "TalentLens — Talent Estimation Agent",
  description:
    "Validasi kebutuhan talent dari WBS dengan Use Case Points dan bottom-up, dibantu agent AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  );
}
