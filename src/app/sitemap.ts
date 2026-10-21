import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = { en: siteUrl, de: `${siteUrl}/de` };
  return [
    {
      url: home.en,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: home },
    },
    {
      url: home.de,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: home },
    },
    ...AREAS.flatMap((area) => {
      const urls = {
        en: `${siteUrl}/parking/${area.slug}`,
        de: `${siteUrl}/de/parking/${area.slug}`,
      };
      return [
        {
          url: urls.en,
          changeFrequency: "monthly" as const,
          priority: 0.8,
          alternates: { languages: urls },
        },
        {
          url: urls.de,
          changeFrequency: "monthly" as const,
          priority: 0.8,
          alternates: { languages: urls },
        },
      ];
    }),
  ];
}
