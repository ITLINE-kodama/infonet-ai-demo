// =============================================================
//  /api/blog ─ ブログ記事の保存・取得（Netlify Blobs）
//  GET    /api/blog                 採用ページ・一覧用（全件 or ?status=published）
//  GET    /api/blog?id=xxx          1件取得
//  POST   /api/blog                 新規作成
//  PUT    /api/blog?id=xxx          更新
//  DELETE /api/blog?id=xxx          削除
//  DELETE /api/blog?reset=1         デモデータを初期状態に戻す
// =============================================================

import { getStore } from "@netlify/blobs";

const CATEGORIES = ["People", "News", "Culture", "Event"];
const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];

const SEED = [
  {
    id: "blog-seed-001",
    category: "People",
    tags: ["新卒", "成長", "インタビュー"],
    image: "/assets/news/iv-3.webp",
    title: "未経験からの1年。新卒社員が見つけた「面白さ」",
    body: "2025年に新卒で入社した社員に、この1年を振り返ってもらいました。\n\n入社当初はWebの知識もほとんどなく、不安ばかりだったといいます。それでも、先輩がつきっきりでサポートしてくれる環境のなかで、少しずつできることが増えていきました。\n\n「最初は言われたことをこなすだけでした。でも今は、自分から提案できるようになってきた。お客様に喜んでもらえたときの達成感は、ほかでは味わえません」\n\n答えのない仕事だからこそ、面白い。そう語る表情が印象的でした。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-20T01:00:00.000Z",
    updatedAt: "2026-05-20T01:00:00.000Z",
    publishedAt: "2026-05-20T01:00:00.000Z",
  },
  {
    id: "blog-seed-002",
    category: "News",
    tags: ["イベント", "社内", "チーム"],
    image: "/assets/news/seminar.webp",
    title: "全社ミーティング「ALL HANDS 2026」を開催しました",
    body: "先日、全社員が一堂に会する全社ミーティング「ALL HANDS 2026」を開催しました。\n\n半期の振り返りと今後の方針の共有に加え、部署を越えたグループワークを実施。普段は接点の少ないメンバー同士が、これからの会社について語り合いました。\n\n会の後半では、半期のMVP表彰も。日々の努力が会社全体で称えられる、温かい時間となりました。\n\nこうした機会を通じて、私たちは「みんなで働く」ことの価値を大切にしています。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-11T02:00:00.000Z",
    updatedAt: "2026-05-11T02:00:00.000Z",
    publishedAt: "2026-05-11T02:00:00.000Z",
  },
  {
    id: "blog-seed-003",
    category: "Culture",
    tags: ["働き方", "カルチャー", "リモート"],
    image: "/assets/recruit-hero.webp",
    title: "リモートと出社のいいとこ取り。インフォネットの働き方",
    body: "インフォネットでは、職種やプロジェクトに応じて、リモートワークと出社を柔軟に組み合わせています。\n\n集中して作業したい日は自宅で、チームで議論したい日はオフィスで。一人ひとりが、その日の仕事に合わせて働く場所を選んでいます。\n\nオフィスにはコミュニケーションを生む共有スペースを用意。出社した日には、自然と会話が生まれます。\n\n働きやすさと、チームのつながり。その両方を大切にした働き方を、これからも追求していきます。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    publishedAt: "2026-05-02T00:00:00.000Z",
  },
];

function normalizeImage(v) {
  if (typeof v === "string" && (v.startsWith("data:image/") || v.startsWith("/"))) return v;
  return IMAGE_KEYS.includes(v) ? v : "general";
}
function normalizeCategory(v) {
  return CATEGORIES.includes(v) ? v : "News";
}
function normalizeTags(v) {
  if (!Array.isArray(v)) return [];
  return v.map((t) => String(t).trim()).filter(Boolean).slice(0, 6);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function store() {
  return getStore({ name: "infonet-demo", consistency: "strong" });
}

async function loadBlog(s) {
  const raw = await s.get("blog");
  if (raw == null) {
    await s.set("blog", JSON.stringify(SEED));
    return SEED.map((n) => ({ ...n }));
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED.map((n) => ({ ...n }));
  }
}

function sortByRecency(list) {
  return [...list].sort((a, b) => {
    const ka = a.publishedAt || a.updatedAt || a.createdAt || "";
    const kb = b.publishedAt || b.updatedAt || b.createdAt || "";
    return kb.localeCompare(ka);
  });
}

export default async (req) => {
  const s = store();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");

  try {
    if (req.method === "GET") {
      const list = await loadBlog(s);
      if (id) {
        const found = list.find((n) => n.id === id);
        return json(found || null, found ? 200 : 404);
      }
      let result = list;
      if (status) result = result.filter((n) => n.status === status);
      return json(sortByRecency(result));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const list = await loadBlog(s);
      const now = new Date().toISOString();
      const publish = body.status === "published";
      const item = {
        id: "b-" + Date.now().toString(36),
        title: (body.title || "無題の記事").trim(),
        body: body.body || "",
        image: normalizeImage(body.image),
        category: normalizeCategory(body.category),
        tags: normalizeTags(body.tags),
        status: publish ? "published" : "draft",
        authorId: "demo-user-01",
        authorName: body.authorName || "インフォネット担当者",
        createdAt: now,
        updatedAt: now,
        publishedAt: publish ? now : undefined,
      };
      list.push(item);
      await s.set("blog", JSON.stringify(list));
      return json(item, 201);
    }

    if (req.method === "PUT") {
      if (!id) return json({ error: "id が必要です" }, 400);
      const body = await req.json();
      const list = await loadBlog(s);
      const i = list.findIndex((n) => n.id === id);
      if (i < 0) return json({ error: "記事が見つかりません" }, 404);
      const now = new Date().toISOString();
      const prev = list[i];
      const next = { ...prev, updatedAt: now };
      if ("title" in body) next.title = (body.title || "無題の記事").trim();
      if ("body" in body) next.body = body.body;
      if ("image" in body) next.image = normalizeImage(body.image);
      if ("category" in body) next.category = normalizeCategory(body.category);
      if ("tags" in body) next.tags = normalizeTags(body.tags);
      if (body.status && body.status !== prev.status) {
        next.status = body.status;
        if (body.status === "published") next.publishedAt = now;
      }
      list[i] = next;
      await s.set("blog", JSON.stringify(list));
      return json(next);
    }

    if (req.method === "DELETE") {
      if (url.searchParams.get("reset") === "1") {
        await s.set("blog", JSON.stringify(SEED));
        return json({ ok: true, reset: true });
      }
      if (!id) return json({ error: "id が必要です" }, 400);
      const list = await loadBlog(s);
      await s.set("blog", JSON.stringify(list.filter((n) => n.id !== id)));
      return json({ ok: true });
    }

    return json({ error: "対応していないメソッドです" }, 405);
  } catch (err) {
    return json({ error: "サーバーエラー", details: String(err) }, 500);
  }
};
