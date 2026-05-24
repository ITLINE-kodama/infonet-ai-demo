// =============================================================
//  /api/analytics-chat ─ GA4分析ダッシュボードのAIチャット
//  POST { instruction, conversationHistory, currentWidgets }
//   → { action, chatMessage, widget } / { error }
// =============================================================

const SYSTEM_PROMPT = `あなたは「らくらくAI」、GA4アクセス解析の専門家でありダッシュボードビルダーです。
担当者の要望に応じて、ダッシュボードへの可視化追加・分析・質問対応を行います。

【出力はJSONのみ】
{
  "action": "add_widget" | "analyze" | "qa",
  "chatMessage": "担当者への一言（敬体・親しみやすく・2〜4文）",
  "widget": { ... }
}
- add_widget: ダッシュボードに新しいウィジェットを追加。widget 必須。
- analyze: 分析結果を text タイプのウィジェットとして追加。widget 必須（type:"text"）。
- qa: 質問への回答のみ。widget 無し。

【widget の型と data 形式】
- type: "kpi" → data: { "value": "1,234", "label": "セッション数", "delta": "+12%", "deltaPositive": true }
- type: "bar" → data: { "labels": ["日本","米国","韓国"], "values": [1200, 80, 45], "color": "#1E2761" }
- type: "doughnut" → data: { "labels": [...], "values": [...], "colors": ["#1E2761","#00B8D9","#10B981","#F59E0B","#8B5CF6"] }
- type: "line" → data: { "labels": ["5/1","5/2",...], "values": [10,15,...], "color": "#1E2761" }
- type: "table" → data: { "columns": ["国","セッション","シェア"], "rows": [["日本",1200,"82%"], ...] }
- type: "text" → data: { "markdown": "## 見出し\\n本文..." }

【widget 共通フィールド】
- title: ウィジェットの見出し（必須）
- description: 短い補足（任意）
- size: "small" | "medium" | "large"（任意。デフォルト medium。表とtextはlarge推奨）

【判断ヒント】
- 「○○を表示／追加／グラフ／カードに」 → action: "add_widget"
- 「分析して／傾向は？／教えて」「○○についてレポート」 → action: "analyze"（type: "text"）
- 雑談・操作質問 → action: "qa"

【データはデモ・架空】
インフォネット採用サイト（中小企業のBtoB Web制作会社）の規模感で：
- 月間PV: 1,000〜3,000
- セッション: 600〜2,000
- ユーザー: 500〜1,500
- 直帰率: 50-65%
- 平均セッション時間: 1:30〜3:00
- 流入: 自然検索40-45%・直接25%・SNS15%・リファラル10%・メール5%
- デバイス: モバイル55% / デスクトップ38% / タブレット7%
- 主要国: 日本82%, 米国5%, 韓国3%, 中国3%, その他7%
- 主要キーワード: 「インフォネット 採用」「Web制作 求人 新橋」「DX エンジニア 中途」など
- 数字は現実的に・話に応じて少しずつ変える（同じ要望で同じ数字を返さない）

【chatMessage の書き方】
- 敬体・親しみやすく・絵文字を控えめに使ってよい
- 2〜4文、追加した内容と次の一手を案内すると親切
- 例：「国別のセッション数を棒グラフで追加しました📊 日本からの流入が圧倒的に多いですね。『国別の直帰率も知りたい』とお話しいただければ、さらに分析を追加できます。」

【ルール】
- JSON以外（前置き・後書き）は一切出力しない
- 最初の文字は「{」、最後の文字は「}」
- data の数値はクオート不要（数値のまま）。文字列はクオートで囲む。
- 例えば「セッションを国別で表示」と来たら type:"bar" or "table" を選び、日本中心の現実的データを返す`;

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

function mockResponse(instruction) {
  const msg = String(instruction || "");
  // ざっくりキーワードで分岐したモック
  if (/分析|傾向|レポート|教えて/.test(msg)) {
    return {
      action: "analyze",
      chatMessage: "（デモモック）簡易分析を追加しました。本番では Claude が実データに沿った詳細レポートを出します。",
      widget: {
        type: "text",
        title: "簡易分析サマリー",
        size: "large",
        data: {
          markdown: "## 現状サマリー\n- 直近30日のセッションは堅調に推移\n- 自然検索からの流入が中心\n- モバイル比率が高く、スマートフォン最適化が効いている\n\n## 改善余地\n- 直帰率がやや高め。LP のファーストビュー改善で深掘りを促進できる\n- ブログ更新頻度を月3〜4本に増やすと長期的に検索流入が伸びやすい",
        },
      },
    };
  }
  return {
    action: "add_widget",
    chatMessage: "（デモモック）ウィジェットを追加しました。本番では Claude が指示に応じた可視化を生成します。",
    widget: {
      type: "doughnut",
      title: "サンプル：流入経路",
      data: {
        labels: ["自然検索", "直接", "SNS", "リファラル", "メール"],
        values: [42, 25, 16, 11, 6],
        colors: ["#1E2761", "#00B8D9", "#10B981", "#F59E0B", "#8B5CF6"],
      },
    },
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応しています" }, 405);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: "リクエスト形式が不正です" }, 400); }

  const instruction = String(payload.instruction || "").trim();
  const history = Array.isArray(payload.conversationHistory) ? payload.conversationHistory : [];
  const currentWidgets = Array.isArray(payload.currentWidgets) ? payload.currentWidgets : [];
  if (!instruction) return json({ error: "指示文を入力してください" }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || isExpired()) {
    return json({ ...mockResponse(instruction), tokensUsed: 0, model: "デモモック", mode: isExpired() ? "expired" : "mock" });
  }

  try {
    const contextLine = currentWidgets.length
      ? "現在ダッシュボードに追加済みのカスタムウィジェット：" +
        JSON.stringify(currentWidgets.map((w) => ({ type: w.type, title: w.title })))
      : "ダッシュボードにカスタムウィジェットはまだありません。";
    const messages = [
      ...history,
      { role: "user", content: contextLine + "\n\n担当者からの指示：\n" + instruction },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        temperature: 0.5,
        system: SYSTEM_PROMPT,
        messages,
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

    const action = ["add_widget", "analyze", "qa"].includes(parsed.action) ? parsed.action : "qa";
    return json({
      action,
      chatMessage: typeof parsed.chatMessage === "string" ? parsed.chatMessage : "応答を受け取りました。",
      widget: parsed.widget && typeof parsed.widget === "object" ? parsed.widget : null,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
      mode: "live",
    });
  } catch (err) {
    return json({ ...mockResponse(instruction), tokensUsed: 0, model: "デモモック（自動切替）", mode: "fallback", note: String(err) });
  }
};
