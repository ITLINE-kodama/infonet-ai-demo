// =============================================================
//  /sitemap.xml ─ ニュース・求人・ブログを含むサイトマップ自動生成
// =============================================================

import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "infonet-demo", consistency: "strong" });
}
async function safeJson(s, key) {
  try {
    const raw = await s.get(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default async (req) => {
  const base = "https://infonet-ai-demo.netlify.app";
  const s = store();
  const [news, jobs, blog] = await Promise.all([
    safeJson(s, "news"),
    safeJson(s, "jobs"),
    safeJson(s, "blog"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  // 固定ページ
  entries.push({ loc: `${base}/`, lastmod: today, changefreq: "weekly", priority: "1.0" });
  entries.push({ loc: `${base}/recruit.html`, lastmod: today, changefreq: "weekly", priority: "0.9" });

  // 公開済みのみ
  (Array.isArray(news) ? news : []).filter((n) => n.status === "published").forEach((n) => {
    const lm = (n.updatedAt || n.publishedAt || n.createdAt || today).slice(0, 10);
    entries.push({ loc: `${base}/news.html?id=${encodeURIComponent(n.id)}`, lastmod: lm, changefreq: "monthly", priority: "0.7" });
  });
  (Array.isArray(jobs) ? jobs : []).filter((n) => n.status === "published").forEach((n) => {
    const lm = (n.updatedAt || n.publishedAt || n.createdAt || today).slice(0, 10);
    entries.push({ loc: `${base}/job.html?id=${encodeURIComponent(n.id)}`, lastmod: lm, changefreq: "weekly", priority: "0.8" });
  });
  (Array.isArray(blog) ? blog : []).filter((n) => n.status === "published").forEach((n) => {
    const lm = (n.updatedAt || n.publishedAt || n.createdAt || today).slice(0, 10);
    entries.push({ loc: `${base}/blog.html?id=${encodeURIComponent(n.id)}`, lastmod: lm, changefreq: "monthly", priority: "0.7" });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
