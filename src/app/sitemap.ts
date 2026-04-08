import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://dekesharon.com";

  const routes = [
    { url: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { url: "/about", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/arrangements", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/coaching", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/workshops", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/speaking", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/masterclass", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/booking", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/find-group", priority: 0.7, changeFrequency: "weekly" as const },
    { url: "/services", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/media", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/events", priority: 0.7, changeFrequency: "weekly" as const },
    { url: "/news", priority: 0.6, changeFrequency: "weekly" as const },
    { url: "/artwork", priority: 0.5, changeFrequency: "monthly" as const },
    { url: "/pitch-perfect-diary", priority: 0.6, changeFrequency: "yearly" as const },
  ];

  return routes.map(({ url, priority, changeFrequency }) => ({
    url: `${baseUrl}${url}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
