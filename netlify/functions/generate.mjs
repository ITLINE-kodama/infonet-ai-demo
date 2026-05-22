// =============================================================
//  /api/generate ─ らくらくAI（Claude API プロキシ）
//  ・ANTHROPIC_API_KEY があれば Claude API で本物の生成
//  ・キー未設定 / API障害 / デモ期間終了時 はモック応答に自動切替
// =============================================================

const SYSTEM_PROMPT = `あなたは「らくらくAI」という、企業のWebサイト更新を支援するAIアシスタントです。

【あなたの役割】
- 担当者からの指示を受け取り、Webサイトに掲載する「お知らせ記事」のドラフトを作成する
- 法人サイトに掲載される文章としてふさわしい、丁寧でビジネス的なトーンで書く
- 必ず「タイトル」と「本文」の両方を含めて出力する

【出力ルール】
- 必ず以下のJSON形式で応答してください
- JSON以外のテキスト（前置き・後書き・説明）は一切出力しない
- JSONの最初の文字は「{」、最後の文字は「}」でなければなりません
- フォーマット:
{
  "title": "（記事のタイトル、30文字以内推奨）",
  "body": "（記事の本文、200〜600文字程度）",
  "imageKey": "（記事内容に最も合うサムネイル画像を次から1つ選ぶ：maintenance=メンテナンス・障害／recruit=採用・募集／relocation=移転・拠点／seminar=セミナー・イベント／general=その他全般）",
  "chatMessage": "（チャット欄に表示する一言メッセージ）"
}

【文章作成ルール】
- 本文は「平素より弊社サービスをご利用いただき、誠にありがとうございます。」のような定型挨拶から始めることを推奨（指示によっては省略可）
- 段落は適切に改行する
- 日付や時間が指定された場合は、正確に反映する
- 不明な情報は推測せず、担当者が後で埋められる形にする（例：「※詳細は別途ご案内いたします」）

【会社情報（参考）】
- 会社名：株式会社インフォネット
- 業種：Webサイト制作・システム開発・DXコンサルティング
- お知らせの想定読者：取引先・顧客企業の担当者

【避けるべき表現】
- カジュアルすぎる口語（例：「〜だよ」「〜だね」）
- 過度に感情的な表現
- 不確実な情報の断定`;

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

const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];

// --- モック応答（キーワードで分岐）---------------------------------
function buildMock(message) {
  const m = String(message || "");
  if (/メンテ|サーバー|停止|障害/.test(m)) {
    return {
      imageKey: "maintenance",
      title: "サーバーメンテナンス実施のお知らせ",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、サービス品質向上のため、下記日程にてサーバーメンテナンスを実施いたします。\n\n■ 実施日時\n2026年5月26日（月）9:00〜12:00\n\n■ 影響範囲\nメンテナンス中は一時的にサービスをご利用いただけません。\n\nお客様にはご不便をおかけいたしますが、何卒ご理解とご協力を賜りますようお願い申し上げます。\n※詳細は別途ご案内いたします。",
    };
  }
  if (/採用|求人|エントリー|新卒|中途/.test(m)) {
    return {
      imageKey: "recruit",
      title: "新卒採用エントリー受付開始のお知らせ",
      body: "平素より弊社に格別のご高配を賜り、厚く御礼申し上げます。\n\nこの度、新卒採用のエントリー受付を開始いたしました。\n\n■ 募集職種\nWebエンジニア／Webデザイナー／ディレクター\n\n■ エントリー締切\n2026年6月30日（火）\n\nご応募を心よりお待ちしております。\n※詳細は採用ページをご確認ください。",
    };
  }
  if (/移転|オフィス|引っ越し|住所/.test(m)) {
    return {
      imageKey: "relocation",
      title: "本社オフィス移転のお知らせ",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、業務拡大に伴い、本社オフィスを下記へ移転する運びとなりました。\n\n■ 新所在地\n東京都千代田区丸の内1-1-1\n\n■ 移転日\n2026年5月1日（金）\n\n今後とも変わらぬご愛顧を賜りますようお願い申し上げます。",
    };
  }
  if (/セミナー|イベント|ウェビナー|説明会|開催/.test(m)) {
    return {
      imageKey: "seminar",
      title: "オンラインセミナー開催のお知らせ",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、下記のとおりオンラインセミナーを開催いたします。\n\n■ テーマ\n企業のWebサイトとAI活用\n\n■ 開催日時\n2026年6月15日（月）14:00〜15:30\n\n■ 参加費\n無料（要事前申込）\n\n皆さまのご参加を心よりお待ちしております。",
    };
  }
  return {
    imageKey: "general",
    title: "お知らせ",
    body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\n" + (m ? m + "\n\n" : "") + "詳細につきましては、改めてご案内いたします。\n\n今後とも何卒よろしくお願い申し上げます。\n※この文章はデモ用のサンプル応答です。",
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POSTのみ対応しています" }, 405);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "リクエスト形式が不正です" }, 400);
  }
  const userMessage = payload.userMessage || "";
  const conversationHistory = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory
    : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const expired = isExpired();

  // --- モードA: モック（キー未設定 / デモ期間終了）-----------------
  if (!apiKey || expired) {
    const mock = buildMock(userMessage);
    return json({
      title: mock.title,
      body: mock.body,
      imageKey: mock.imageKey,
      chatMessage: expired
        ? "本デモのAI生成期間は終了しました。サンプル原稿を表示しています。"
        : "ドラフトを作成しました。本文とサムネイル画像を右側のプレビューでご確認ください。（デモモード）",
      tokensUsed: 0,
      model: "デモモック",
      mode: expired ? "expired" : "mock",
    });
  }

  // --- モードB: Claude API で本物の生成 -----------------------------
  try {
    const messages = [...conversationHistory, { role: "user", content: userMessage }];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        temperature: 0.5,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) throw new Error("Claude API がステータス " + res.status + " を返しました");

    const data = await res.json();
    const rawText =
      (data.content || []).find((c) => c.type === "text")?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed || !parsed.title || !parsed.body) {
      throw new Error("AI応答のフォーマットが不正です");
    }

    return json({
      title: parsed.title,
      body: parsed.body,
      imageKey: IMAGE_KEYS.includes(parsed.imageKey) ? parsed.imageKey : "general",
      chatMessage:
        parsed.chatMessage ||
        "ドラフトを作成しました。右側のプレビューでご確認ください。",
      tokensUsed:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-5",
      mode: "live",
    });
  } catch (err) {
    // --- モードC: API障害時はモックへ自動フォールバック --------------
    const mock = buildMock(userMessage);
    return json({
      title: mock.title,
      body: mock.body,
      imageKey: mock.imageKey,
      chatMessage:
        "AIとの通信が混み合っているため、サンプル原稿を表示しています。内容はそのままご利用いただけます。",
      tokensUsed: 0,
      model: "デモモック（自動切替）",
      mode: "fallback",
      note: String(err),
    });
  }
};
