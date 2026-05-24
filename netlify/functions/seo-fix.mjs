// =============================================================
//  /api/seo-fix ─ 個別コンテンツのSEO改善案を生成
//  POST { type: "news|blog|job", current: {title, body, image, ...} }
//   → { title, body, image, rationale } / { error }
// =============================================================

const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];

const SYSTEM_PROMPT = `あなたは法人サイトのSEOコンサルタントかつコピーライターです。
現在のコンテンツ（お知らせ／求人／ブログのいずれか）を受け取り、SEOに強く、かつ自然で読みやすい改善案を提案します。

【出力形式（JSON）】
必ず以下のJSON形式のみで応答してください。JSON以外のテキスト（前置き・後書き）は出力しない。
{
  "title": "改善版のタイトル（25-45文字。検索キーワードを意識しつつ自然な日本語で）",
  "body": "改善版の本文（500-900文字推奨。■で始まる見出しを使い、段落分け。元のメッセージ・意図を保ちつつ詳細化）",
  "image": "推奨画像キー（maintenance=メンテナンス・障害／recruit=採用・募集／relocation=移転・拠点／seminar=セミナー・イベント／general=その他全般 から内容に最も合うもの。変更不要なら現在のキーを返す）",
  "rationale": "なぜこの改善が効果的かを1-2文で。タイトル・本文の方針と、画像キーの選択理由（なぜそのキーが最適か）を必ず触れる。担当者向けに親しみやすく。"
}

【コンテンツ別の改善方針】
- type="news"：会社からの正式なお知らせ。冒頭の挨拶「平素より弊社サービスをご利用いただき」等のビジネスマナーは残す
- type="job"：求人。■ 仕事内容／■ 応募資格／■ 雇用形態／■ 勤務地 の見出し構造を必ず含む
- type="blog"：採用ブログ。読み物として自然なトーン、社員視点も活用

【SEO観点での重要事項】
- タイトルに具体的なキーワード（職種名／場所／時期／会社名）を含める
- 本文は十分な情報量（最低500文字）でユーザーの疑問に答える
- 短すぎる本文・タイトルは検索順位が上がりにくいため、必ず充実させる
- 元の意図を曲げない（完全な書き換えではなく、SEOに耐えるレベルへの拡充）

【会社情報】
- 株式会社インフォネット（Webサイト制作・システム開発・DXコンサルティング）
- 所在地：東京都港区新橋4-21-3 新橋東急ビル7F
- 採用は職種により リモート併用可

JSONの最初の文字は「{」、最後の文字は「}」`;

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

// モック（API未設定／障害時）
function mockFix(type, current) {
  const baseBody =
    "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\n" +
    "■ ご案内の背景\n" +
    (current.body || "") + "\n\n" +
    "■ 詳細\n※ 詳細につきましては、別途ご案内いたします。\n\n" +
    "■ お問い合わせ\n本件に関するご質問は、お問い合わせフォームよりお気軽にご連絡ください。";
  return {
    title: (current.title || "お知らせ") + "（更新版）",
    body: baseBody,
    image: current.image || "general",
    rationale: "タイトル・本文ともに情報量を増やし、SEOキーワードを意識した構成に整えました。（デモモード）",
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応しています" }, 405);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: "リクエスト形式が不正です" }, 400); }

  const type = String(payload.type || "news");
  const current = payload.current && typeof payload.current === "object" ? payload.current : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || isExpired()) {
    return json({ ...mockFix(type, current), tokensUsed: 0, model: "デモモック", mode: isExpired() ? "expired" : "mock" });
  }

  try {
    const userMessage =
      "コンテンツ種別: " + type + "\n\n" +
      "現在のコンテンツ:\n" +
      "タイトル: " + (current.title || "") + "\n" +
      "本文:\n" + (current.body || "") + "\n" +
      "画像キー: " + (current.image || "") + "\n\n" +
      "上記をSEOに強い形へ改善してください。元の意図は保ち、情報量を増やし、自然な日本語で。";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error("Claude API がステータス " + res.status + " を返しました");

    const data = await res.json();
    const rawText = (data.content || []).find((c) => c.type === "text")?.text || "";
    let parsed;
    try { parsed = JSON.parse(rawText); }
    catch {
      const m = rawText.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed || typeof parsed !== "object") throw new Error("AI応答のフォーマットが不正です");

    const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : current.title;
    const body  = typeof parsed.body  === "string" && parsed.body.trim()  ? parsed.body.trim()  : current.body;
    const image = IMAGE_KEYS.includes(parsed.image) ? parsed.image
                : (typeof current.image === "string" ? current.image : "general");
    const rationale = typeof parsed.rationale === "string" ? parsed.rationale : "";

    return json({
      title, body, image, rationale,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
      mode: "live",
    });
  } catch (err) {
    return json({
      ...mockFix(type, current),
      tokensUsed: 0,
      model: "デモモック（自動切替）",
      mode: "fallback",
      note: String(err),
    });
  }
};
