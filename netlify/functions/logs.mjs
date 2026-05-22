// =============================================================
//  /api/logs ─ 操作ログ・履歴（Netlify Blobs）
//  GET    /api/logs            全ログ取得（新しい順）
//  POST   /api/logs            ログ1件追加
//  DELETE /api/logs?reset=1    ログを全消去
// =============================================================

import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function store() {
  return getStore({ name: "infonet-demo", consistency: "strong" });
}

async function loadLogs(s) {
  const raw = await s.get("logs");
  if (raw == null) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default async (req) => {
  const s = store();
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const list = await loadLogs(s);
      list.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      return json(list);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const list = await loadLogs(s);
      const item = {
        id: "l-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        timestamp: new Date().toISOString(),
        userId: "demo-user-01",
        userName: body.userName || "インフォネット担当者",
        action: body.action || "edit",
        targetId: body.targetId,
        targetTitle: body.targetTitle,
        aiModel: body.aiModel,
        userPrompt: body.userPrompt,
        aiOutput: body.aiOutput,
        tokensUsed: body.tokensUsed,
      };
      list.push(item);
      await s.set("logs", JSON.stringify(list));
      return json(item, 201);
    }

    if (req.method === "DELETE") {
      if (url.searchParams.get("reset") === "1") {
        await s.set("logs", JSON.stringify([]));
        return json({ ok: true, reset: true });
      }
      return json({ error: "reset=1 が必要です" }, 400);
    }

    return json({ error: "対応していないメソッドです" }, 405);
  } catch (err) {
    return json({ error: "サーバーエラー", details: String(err) }, 500);
  }
};
