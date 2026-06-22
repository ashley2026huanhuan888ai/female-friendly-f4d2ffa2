import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://female-friendly.lovable.app";

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
          { path: "/about", changefreq: "weekly", priority: "0.8" },
          { path: "/discussions", changefreq: "daily", priority: "0.8" },
          { path: "/feed", changefreq: "daily", priority: "0.8" },
          { path: "/feedback", changefreq: "monthly", priority: "0.5" },
          { path: "/knowledge", changefreq: "weekly", priority: "0.8" },
          { path: "/request-object", changefreq: "monthly", priority: "0.6" },
          { path: "/topics", changefreq: "daily", priority: "0.7" },
          { path: "/archive", changefreq: "daily", priority: "0.8" },
          { path: "/archive/evidence", changefreq: "weekly", priority: "0.7" },
          { path: "/objects", changefreq: "daily", priority: "0.9" },
        ];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [{ data: objects }, { data: cases }, { data: topicObs }] = await Promise.all([
          supabaseAdmin
            .from("objects")
            .select("id, updated_at")
            .eq("status", "published")
            .eq("hidden", false),
          supabaseAdmin
            .from("observations")
            .select("case_code, created_at")
            .eq("status", "approved")
            .not("case_code", "is", null),
          supabaseAdmin
            .from("observations")
            .select("tags, created_at")
            .eq("status", "approved"),
        ]);

        for (const o of objects ?? []) {
          entries.push({
            path: `/objects/${o.id}`,
            lastmod: o.updated_at ? o.updated_at.slice(0, 10) : undefined,
            changefreq: "daily",
            priority: "0.8",
          });
        }

        const seenCases = new Set<string>();
        for (const c of cases ?? []) {
          if (!c.case_code || seenCases.has(c.case_code)) continue;
          seenCases.add(c.case_code);
          entries.push({
            path: `/archive/${encodeURIComponent(c.case_code)}`,
            lastmod: c.created_at ? c.created_at.slice(0, 10) : undefined,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        const tagSet = new Set<string>();
        for (const o of topicObs ?? []) {
          const tags = Array.isArray(o.tags) ? (o.tags as string[]) : [];
          for (const t of tags) tagSet.add(t);
        }
        for (const tag of tagSet) {
          entries.push({
            path: `/topics/${encodeURIComponent(tag)}`,
            changefreq: "daily",
            priority: "0.6",
          });
        }

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
