import type { MetadataRoute } from "next";

const SITE = "https://talentlens.adryanrizkyalviano.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [["", 1], ["/validasi", 0.8], ["/metodologi", 0.7], ["/katalog", 0.6], ["/tentang", 0.6], ["/feedback", 0.4]];
  return pages.map(([path, priority]) => ({ url: SITE + path, lastModified: new Date(), changeFrequency: "monthly", priority }));
}
