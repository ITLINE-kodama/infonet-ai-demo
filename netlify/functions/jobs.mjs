// =============================================================
//  /api/jobs ─ 求人（募集職種）の保存・取得（Netlify Blobs）
//  GET    /api/jobs                 採用ページ・一覧用（全件 or ?status=published）
//  GET    /api/jobs?id=xxx          1件取得
//  POST   /api/jobs                 新規作成
//  PUT    /api/jobs?id=xxx          更新
//  DELETE /api/jobs?id=xxx          削除
//  DELETE /api/jobs?reset=1         デモデータを初期状態に戻す
// =============================================================

import { getStore } from "@netlify/blobs";

const SEED = [
  {
    id: "job-seed-001",
    image: "recruit",
    title: "Webディレクター（中途）",
    body: "Webサイト制作プロジェクトの企画・進行管理をお任せします。\n\n■ 仕事内容\nクライアントのヒアリングから企画提案、制作チームのディレクション、納品までを一貫して担当いただきます。\n\n■ 応募資格\n・Web制作のディレクション経験3年以上\n・クライアント折衝のご経験\n\n■ 雇用形態\n正社員\n\n■ 勤務地\n東京都港区新橋（リモート併用可）\n\n※詳細は面談時にご案内いたします。",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-10T01:00:00.000Z",
    updatedAt: "2026-05-10T01:00:00.000Z",
    publishedAt: "2026-05-10T01:00:00.000Z",
  },
  {
    id: "job-seed-002",
    image: "recruit",
    title: "フロントエンドエンジニア（中途）",
    body: "コーポレートサイト・Webアプリケーションのフロントエンド開発を担当いただきます。\n\n■ 仕事内容\nHTML / CSS / JavaScript を用いた実装、UIコンポーネント開発、パフォーマンス改善。\n\n■ 応募資格\n・フロントエンド開発の実務経験2年以上\n・JavaScript / TypeScript の知識\n\n■ 雇用形態\n正社員\n\n■ 勤務地\n東京都港区新橋（フルリモート可）",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-08T02:00:00.000Z",
    updatedAt: "2026-05-08T02:00:00.000Z",
    publishedAt: "2026-05-08T02:00:00.000Z",
  },
  {
    id: "job-seed-003",
    image: "recruit",
    title: "総合職（2027年度 新卒採用）",
    body: "2027年度の新卒採用として、総合職を募集します。\n\n■ 仕事内容\nWebディレクション・営業・マーケティングなど、適性に応じて配属します。未経験から育成します。\n\n■ 応募資格\n・2027年3月までに四年制大学・大学院を卒業見込みの方\n・Webやデジタル領域に興味をお持ちの方\n\n■ 雇用形態\n正社員\n\n■ 勤務地\n東京都港区新橋",
    status: "published",
    authorId: "demo-user-01",
    authorName: "インフォネット担当者",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    publishedAt: "2026-05-01T00:00:00.000Z",
  },
];

const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];

function normalizeImage(v) {
  if (typeof v === "string" && v.startsWith("data:image/")) return v;
  return IMAGE_KEYS.includes(v) ? v : "recruit";
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

async function loadJobs(s) {
  const raw = await s.get("jobs");
  if (raw == null) {
    await s.set("jobs", JSON.stringify(SEED));
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
      const list = await loadJobs(s);
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
      const list = await loadJobs(s);
      const now = new Date().toISOString();
      const publish = body.status === "published";
      const item = {
        id: "j-" + Date.now().toString(36),
        title: (body.title || "無題の求人").trim(),
        body: body.body || "",
        image: normalizeImage(body.image),
        status: publish ? "published" : "draft",
        authorId: "demo-user-01",
        authorName: body.authorName || "インフォネット担当者",
        createdAt: now,
        updatedAt: now,
        publishedAt: publish ? now : undefined,
      };
      list.push(item);
      await s.set("jobs", JSON.stringify(list));
      return json(item, 201);
    }

    if (req.method === "PUT") {
      if (!id) return json({ error: "id が必要です" }, 400);
      const body = await req.json();
      const list = await loadJobs(s);
      const i = list.findIndex((n) => n.id === id);
      if (i < 0) return json({ error: "求人が見つかりません" }, 404);
      const now = new Date().toISOString();
      const prev = list[i];
      const next = { ...prev, updatedAt: now };
      if ("title" in body) next.title = (body.title || "無題の求人").trim();
      if ("body" in body) next.body = body.body;
      if ("image" in body) next.image = normalizeImage(body.image);
      if (body.status && body.status !== prev.status) {
        next.status = body.status;
        if (body.status === "published") next.publishedAt = now;
      }
      list[i] = next;
      await s.set("jobs", JSON.stringify(list));
      return json(next);
    }

    if (req.method === "DELETE") {
      if (url.searchParams.get("reset") === "1") {
        await s.set("jobs", JSON.stringify(SEED));
        return json({ ok: true, reset: true });
      }
      if (!id) return json({ error: "id が必要です" }, 400);
      const list = await loadJobs(s);
      await s.set("jobs", JSON.stringify(list.filter((n) => n.id !== id)));
      return json({ ok: true });
    }

    return json({ error: "対応していないメソッドです" }, 405);
  } catch (err) {
    return json({ error: "サーバーエラー", details: String(err) }, 500);
  }
};
