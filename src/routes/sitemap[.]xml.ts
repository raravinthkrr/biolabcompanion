import { createFileRoute } from "@tanstack/react-router";
import { CALCULATORS } from "@/lib/calculators/registry";

// TODO: update to the production domain when a custom domain is set
const BASE_URL = "https://id-preview--301e2fde-77b6-4a56-b61b-a5572973c392.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/assistant", changefreq: "weekly", priority: "0.9" },
          { path: "/planner", changefreq: "weekly", priority: "0.9" },
          { path: "/protocols", changefreq: "weekly", priority: "0.9" },
          { path: "/reagents", changefreq: "weekly", priority: "0.9" },
          { path: "/calculators", changefreq: "weekly", priority: "0.9" },
          ...CALCULATORS.map((c) => ({
            path: `/calculators/${c.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
