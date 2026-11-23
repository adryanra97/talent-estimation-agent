import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import { StoreProvider } from "@/lib/store";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "./globals.css";
import "./editorial.css";
import "./resource.css";
import "./studio.css";
import "./refinement.css";
import "./tln.css";
import "./operational-theme.css";
import "./reference.css";

const SITE = "https://talentlens.adryanrizkyalviano.me";
const TITLE = "TalentLens · Estimasi kebutuhan talent dari WBS";
const DESCRIPTION =
  "Cek apakah jumlah talent yang diminta sesuai dengan pekerjaannya. TalentLens menghitung kebutuhan per role dari WBS dengan UCP dan bottom-up, lalu menunjukkan asal setiap angka.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · TalentLens" },
  description: DESCRIPTION,
  applicationName: "TalentLens",
  authors: [{ name: "Adryan Rizky Alviano" }],
  creator: "Adryan Rizky Alviano",
  keywords: ["estimasi talent", "kebutuhan FTE", "WBS", "Use Case Points", "bottom-up estimation", "workforce planning", "AI agent"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "TalentLens",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#131017" };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TalentLens",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "id",
  author: { "@type": "Person", name: "Adryan Rizky Alviano" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  );
}
