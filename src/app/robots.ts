import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/dashboard/", "/api/", "/login"],
      },
    ],
    sitemap: "https://dekesharon.com/sitemap.xml",
  };
}
