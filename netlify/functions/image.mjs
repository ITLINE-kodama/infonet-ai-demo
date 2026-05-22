// =============================================================
//  /api/image ─ お知らせ用サムネイル画像を Gemini で生成
//  ・GEMINI_API_KEY があれば Gemini で画像を生成
//  ・キー未設定 / API障害 / デモ期間終了時 は { fallback:true } を返し、
//    呼び出し側（store.js）が固定ライブラリ画像にフォールバックする
// =============================================================

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// デモ期間（環境変数 DEMO_EXPIRES_AT が過去日なら true）
function isExpired() {
  const exp = process.env.DEMO_EXPIRES_AT;
  if (!exp) return false;
  const t = Date.parse(exp);
  return !Number.isNaN(t) && Date.now() > t;
}

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応" }, 405);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ fallback: true });
  }
  const topic = String(payload.topic || payload.title || "お知らせ").slice(0, 300);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || isExpired()) {
    return json({ fallback: true, reason: isExpired() ? "expired" : "no-key" });
  }

  const prompt =
    `日本企業のコーポレートサイトの「お知らせ」に掲載するサムネイル画像を生成してください。` +
    `記事テーマ：「${topic}」。` +
    `スタイル：高品質で洗練されたビジネス写真調、清潔感のある明るい雰囲気、` +
    `ディープネイビー〜ブルーを基調とした落ち着いた配色、プロフェッショナルで上品。横長16:9。` +
    `画像内に文字・ロゴ・透かしは一切入れないでください。`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            responseFormat: { image: { aspectRatio: "16:9", imageSize: "1K" } },
          },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini API がステータス " + res.status + " を返しました");

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p.inline_data?.data || p.inlineData?.data);
    const inline = imgPart?.inline_data || imgPart?.inlineData;
    if (!inline?.data) throw new Error("画像データが取得できませんでした");

    const mime = inline.mime_type || inline.mimeType || "image/png";
    return json({
      imageDataUrl: `data:${mime};base64,${inline.data}`,
      model: MODEL,
    });
  } catch (err) {
    // 失敗時はフォールバック指示を返す（デモを止めない）
    return json({ fallback: true, error: String(err) });
  }
};
