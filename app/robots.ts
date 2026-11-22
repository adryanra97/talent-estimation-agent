import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/hasil/", "/proses", "/masuk", "/pengaturan", "/api/"] },
    sitemap: "https://talentlens.adryanrizkyalviano.me/sitemap.xml",
  };
}
