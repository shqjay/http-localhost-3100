import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const vercelUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (vercelUrl ? "https://" + vercelUrl : "http://localhost:3000")
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: updatedAt,
      changeFrequency: "weekly",
      priority: 1
    }
  ];

  if (process.env.GITHUB_ACTIONS !== "true") {
    entries.push({
      url: siteUrl + "/register/",
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.8
    });
  }

  return entries;
}