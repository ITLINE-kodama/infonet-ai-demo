// =============================================================
//  /api/recruit-ai ─ 採用ページ内容をAIに直接指示して更新
//  POST { instruction, current } → { recruit: 更新後のJSON } / { error }
// =============================================================

const SYSTEM_PROMPT = `あなたは企業の採用ページの内容を編集するAIアシスタントです。
現在の採用ページ内容（JSON）と担当者からの指示を受け取り、指示どおりに更新したJSON全体を返します。

【JSONスキーマ】
{
  "mvTitle": "メインビジュアルのキャッチコピー（文字列）",
  "mvSubtitle": "メインビジュアルのサブテキスト（文字列）",
  "message": "採用メッセージ本文（文字列・改行可）",
  "interviews": [ { "id": "...", "name": "氏名", "role": "職種・入社年", "comment": "インタビュー本文", "image": "画像キー" } ],
  "stats": [ { "label": "項目名", "value": "数値" } ],
  "benefits": [ { "title": "制度名", "desc": "説明" } ]
}

【ルール】
- 指示で求められた箇所だけを変更し、それ以外の項目・配列要素はすべてそのまま保持する
- 社員インタビューを追加する場合、id は "iv-" + 適当な英数字、image は "recruit" とする
- image フィールドは、画像に関する指示がない限り元の値をそのまま保持する
- 文章は求職者向けの誠実で前向きなトーンで書く
- 出力は更新後のJSONオブジェクトのみ。説明・前置き・後書きは一切出力しない
- JSONの最初の文字は「{」、最後の文字は「}」でなければならない

【会社情報（参考）】
- 会社名：株式会社インフォネット（Webサイト制作・システム開発・DXコンサルティング、東京都港区新橋）`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isExpired() {
  const exp = process.env.DEMO_EXPIRES_AT;
  if (!exp) return false;
  const t = Date.parse(exp);
  return !Number.isNaN(t) && Date.now() > t;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応しています" }, 405);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "リクエスト形式が不正です" }, 400);
  }
  const instruction = String(payload.instruction || "").trim();
  const current = payload.current && typeof payload.current === "object" ? payload.current : {};
  if (!instruction) return json({ error: "指示文を入力してください" }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || isExpired()) {
    return json({
      error: isExpired()
        ? "本デモのAI更新期間は終了しました。"
        : "AIによる更新は現在利用できません（APIキー未設定）。",
    });
  }

  try {
    const userMessage =
      "現在の採用ページ内容（JSON）：\n" +
      JSON.stringify(current) +
      "\n\n担当者からの指示：\n" +
      instruction;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) throw new Error("Claude API がステータス " + res.status + " を返しました");

    const data = await res.json();
    const rawText = (data.content || []).find((c) => c.type === "text")?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI応答のフォーマットが不正です");
    }

    return json({
      recruit: parsed,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
    });
  } catch (err) {
    return json({ error: "AI更新に失敗しました。もう一度お試しください。", details: String(err) }, 200);
  }
};
