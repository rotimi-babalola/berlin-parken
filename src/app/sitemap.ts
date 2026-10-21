import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...AREAS.map((area) => ({
      url: `${siteUrl}/parking/${area.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
