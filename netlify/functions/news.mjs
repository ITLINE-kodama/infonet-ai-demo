// =============================================================
//  /api/news ─ お知らせ記事の保存・取得（Netlify Blobs）
//  GET    /api/news                 公開LP・一覧用（全件 or ?status=published）
//  GET    /api/news?id=xxx          1件取得
//  POST   /api/news                 新規作成
//  PUT    /api/news?id=xxx          更新
//  DELETE /api/news?id=xxx          削除
//  DELETE /api/news?reset=1         デモデータを初期状態に戻す
// =============================================================

import { getStore } from "@netlify/blobs";

const SEED = [
  {
    id: "seed-001",
    image: "general",
    title: "Webサイト制作の新プラン提供を開始しました",
    body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、中小企業様向けにWebサイト制作の新プラン「クイックスタートプラン」の提供を開始いたしました。\n\n短納期・低コストでコーポレートサイトを立ち上げたいお客様に最適なプランです。\n\n詳細はお問い合わせフォームよりお気軽にご相談ください。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-07T01:00:00.000Z",
    updatedAt: "2026-05-07T01:00:00.000Z",
    publishedAt: "2026-05-07T01:00:00.000Z",
  },
  {
    id: "seed-002",
    image: "general",
    title: "ゴールデンウィーク休業のお知らせ",
    body: "平素より格別のご高配を賜り、厚く御礼申し上げます。\n\n誠に勝手ながら、下記の期間をゴールデンウィーク休業とさせていただきます。\n\n■ 休業期間\n2026年5月3日（日）〜 5月6日（水）\n\n休業期間中にいただいたお問い合わせは、5月7日（木）以降に順次対応いたします。\n\nご不便をおかけいたしますが、何卒よろしくお願い申し上げます。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-04-22T02:00:00.000Z",
    updatedAt: "2026-04-22T02:00:00.000Z",
    publishedAt: "2026-04-22T02:00:00.000Z",
  },
  {
    id: "seed-003",
    image: "relocation",
    title: "本社オフィス移転のお知らせ",
    body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、業務拡大に伴い、本社オフィスを下記へ移転いたしました。\n\n■ 新所在地\n東京都千代田区丸の内1-1-1 インフォネットビル\n\n■ 移転日\n2026年4月15日（水）\n\n今後とも変わらぬご愛顧を賜りますようお願い申し上げます。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
    publishedAt: "2026-04-15T00:00:00.000Z",
  },
];

const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function store() {
  return getStore({ name: "infonet-demo", consistency: "strong" });
}

async function loadNews(s) {
  const raw = await s.get("news");
  if (raw == null) {
    await s.set("news", JSON.stringify(SEED));
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
      const list = await loadNews(s);
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
      const list = await loadNews(s);
      const now = new Date().toISOString();
      const publish = body.status === "published";
      const item = {
        id: "n-" + Date.now().toString(36),
        title: (body.title || "無題のお知らせ").trim(),
        body: body.body || "",
        image: IMAGE_KEYS.includes(body.image) ? body.image : "general",
        status: publish ? "published" : "draft",
        authorId: "demo-user-01",
        authorName: body.authorName || "インフォネット担当者",
        createdAt: now,
        updatedAt: now,
        publishedAt: publish ? now : undefined,
      };
      list.push(item);
      await s.set("news", JSON.stringify(list));
      return json(item, 201);
    }

    if (req.method === "PUT") {
      if (!id) return json({ error: "id が必要です" }, 400);
      const body = await req.json();
      const list = await loadNews(s);
      const i = list.findIndex((n) => n.id === id);
      if (i < 0) return json({ error: "記事が見つかりません" }, 404);
      const now = new Date().toISOString();
      const prev = list[i];
      const next = { ...prev, updatedAt: now };
      if ("title" in body) next.title = (body.title || "無題のお知らせ").trim();
      if ("body" in body) next.body = body.body;
      if ("image" in body && IMAGE_KEYS.includes(body.image)) next.image = body.image;
      if (body.status && body.status !== prev.status) {
        next.status = body.status;
        if (body.status === "published") next.publishedAt = now;
      }
      list[i] = next;
      await s.set("news", JSON.stringify(list));
      return json(next);
    }

    if (req.method === "DELETE") {
      if (url.searchParams.get("reset") === "1") {
        await s.set("news", JSON.stringify(SEED));
        return json({ ok: true, reset: true });
      }
      if (!id) return json({ error: "id が必要です" }, 400);
      const list = await loadNews(s);
      await s.set("news", JSON.stringify(list.filter((n) => n.id !== id)));
      return json({ ok: true });
    }

    return json({ error: "対応していないメソッドです" }, 405);
  } catch (err) {
    return json({ error: "サーバーエラー", details: String(err) }, 500);
  }
};
