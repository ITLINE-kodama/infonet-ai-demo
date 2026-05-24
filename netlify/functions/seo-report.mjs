// =============================================================
//  /api/seo-report ─ アクセス解析データからSEOレポートをAI生成
//  POST { summary: {...}, topPages: [...], topQueries: [...] }
//   → { reportMarkdown, tokensUsed, model } / { error }
// =============================================================

const SYSTEM_PROMPT = `あなたは、法人サイトのSEO・Webマーケティングを担当するシニアコンサルタントです。
Webサイトのアクセス解析データ（GA4・Search Console相当のサマリー）を受け取り、現状の評価・課題・改善施策を含む簡潔で実践的なレポートを書きます。

【出力形式】
- 完全な Markdown
- 構成：
  ## 1. 総評（3〜5文）
  ## 2. ハイライト（良い点・伸びている指標）
  ## 3. 課題（改善余地のあるポイント）
  ## 4. SEO改善の具体施策（5項目程度・箇条書きで実行可能なレベルで）
  ## 5. 次の30日の行動プラン（チェックリスト形式）
- 日本語・敬体・親しみやすく具体的に
- 数字はデータから根拠を引いて述べる
- マーケ初心者にもわかる表現にする

【会社情報】
- インフォネット株式会社の採用サイトのアクセス解析
- 採用候補者を集めるための「採用ブランディングサイト」が目的
- 本デモは ITLINE が提供する「AIでらくらく更新」サービスの体験版

【出力ルール】
- Markdown以外のテキスト（前置き・後書き）は出力しない
- 最初の文字は「#」または「##」`;

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

// API失敗時・キー未設定時のサンプルレポート
function mockReport(summary) {
  const pv = summary?.pageViews ?? 0;
  return `## 1. 総評
直近${summary?.rangeDays || 30}日間で合計 **${pv.toLocaleString()} PV**・**${(summary?.users || 0).toLocaleString()} ユーザー** のアクセスを獲得しています。直帰率 ${summary?.bounceRate ?? "-"}% / 平均セッション時間 ${summary?.avgSessionDuration ?? "-"} と、採用ブランディングサイトとして健全な水準です。

## 2. ハイライト
- モバイルからのアクセスが過半数を占めており、若手候補者へのリーチが取れている
- 自然検索からの流入が安定的に伸びている
- 採用情報ページの滞在時間が長く、関心度の高いユーザーが訪問している

## 3. 課題
- 一部の旧来コンテンツでの直帰率が高め
- 検索キーワードの幅がまだ狭く、潜在層へのリーチに改善余地あり
- ブログ更新頻度がやや少なく、新規流入の伸びしろが残っている

## 4. SEO改善の具体施策
- 採用ターゲット向けキーワード（例：「Web制作 採用 新橋」「DX エンジニア 中途」）を意識したタイトル・見出しの調整
- 社員インタビュー記事のスキーママークアップ（Person / Article）追加
- ブログを週1本ペースで更新し、内部リンクで採用ページへ誘導
- 採用ページのメタディスクリプションを職種別に最適化
- スマホ表示のCore Web Vitals（LCP・CLS）改善

## 5. 次の30日の行動プラン
- [ ] 採用ページのキーワード調査・タイトル改善
- [ ] ブログ記事を4本追加（カテゴリーCulture×2、People×2）
- [ ] 社員インタビューに構造化データを実装
- [ ] サイト全体のメタディスクリプション見直し
- [ ] サーチコンソールで上位クエリと表示回数を毎週確認

---
※ 本レポートはデモ環境のサンプルです。本番運用時は実際のGA4・Search Consoleデータを基に生成されます。`;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応しています" }, 405);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "リクエスト形式が不正です" }, 400);
  }
  const summary = payload.summary || {};
  const topPages = Array.isArray(payload.topPages) ? payload.topPages : [];
  const topQueries = Array.isArray(payload.topQueries) ? payload.topQueries : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || isExpired()) {
    return json({
      reportMarkdown: mockReport(summary),
      tokensUsed: 0,
      model: "デモモック",
      mode: isExpired() ? "expired" : "mock",
    });
  }

  try {
    const userMessage =
      "以下のアクセス解析サマリーをもとに、SEOレポートをMarkdownで作成してください。\n\n" +
      "【サマリー】\n" + JSON.stringify(summary, null, 2) + "\n\n" +
      "【人気ページ】\n" + JSON.stringify(topPages, null, 2) + "\n\n" +
      "【検索クエリ（上位）】\n" + JSON.stringify(topQueries, null, 2);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        temperature: 0.5,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error("Claude API がステータス " + res.status + " を返しました");
    const data = await res.json();
    const text = (data.content || []).find((c) => c.type === "text")?.text || "";
    if (!text.trim()) throw new Error("AI応答が空です");

    return json({
      reportMarkdown: text.trim(),
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
      mode: "live",
    });
  } catch (err) {
    return json({
      reportMarkdown: mockReport(summary),
      tokensUsed: 0,
      model: "デモモック（自動切替）",
      mode: "fallback",
      note: String(err),
    });
  }
};
