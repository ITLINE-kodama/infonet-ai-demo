// =============================================================
//  /api/generate ─ らくらくAI（Claude API プロキシ）
//  ・ANTHROPIC_API_KEY があれば Claude API で本物の生成
//  ・キー未設定 / API障害 / デモ期間終了時 はモック応答に自動切替
// =============================================================

// 全プロンプト共通の「質問・相談にも答える」拡張＋知識ベース
const DEMO_KNOWLEDGE = `

────────────────────────────────────────────
【役割の拡張：質問・相談にも丁寧に答える】
担当者から「○○ですか？」「○○について教えて」「○○はどうなってる？」「○○できますか？」など、
コンテンツ作成ではない質問・相談を受けたときは、コンテンツ作成ではなくQ&Aモードで応答する。
Q&Aモードでは：
- title と body は空文字（""）にする
- imageKey は "general" にする
- chatMessage に質問への回答を3〜6文・敬体・親しみやすく書く（必要なら次の一手も提案）
- 形式は通常通りJSON。空文字でも必ずキーは含めること

【判断ヒント】
- 「○○を書いて／作って／更新して」「お知らせを」「求人を」「ブログを」 → コンテンツ作成（通常モード）
- 「○○ですか／対応してる／コードは入ってる／教えて」 → Q&Aモード
- 雑談・励まし → Q&Aモード
- 迷うときは「より親切に答える」方を選ぶ

【SEO・構造化データ・GA4 に関する知識】
このデモサイトには以下がすでに**全ページ自動付与**されています。これらは標準で稼働中です：
- **構造化データ（JSON-LD）**：Organization（会社情報）／BreadcrumbList（パンくず）／Article・NewsArticle・BlogPosting（記事）／JobPosting（求人）／WebSite・ItemList（採用ページ）
- **メタタグ**：title／description／OGP（og:title・og:description・og:image・og:url・og:type）／Twitter Card／canonical
- **sitemap.xml**：/api/sitemap で自動生成（公開済みのお知らせ・求人・ブログを含む）
- **robots.txt**：配置済み（sitemap参照あり）

管理画面側にも以下が実装済み：
- **GA4分析**ダッシュボード（PV・UU・セッション・直帰率・平均滞在・CV／流入経路／デバイス／人気ページ／検索キーワード／SEOスコア）
- **SEO診断**：各コンテンツのタイトル・本文・画像・JSON-LDの品質をチェックしスコア化
- **AI自動対策**：診断結果からAIが改善版コンテンツ＋新規画像を生成して適用（個別・一括）
- **AIで詳細レポート生成**（GA4分析画面）：SEOコンサルレポートを Markdown で出力

「このコードは入っていますか？」「対応してますか？」と聞かれたら、上記の自動付与機能を具体的に挙げて「はい、全ページに自動で付与されています」と答える。確認方法（ブラウザのDevTools、サーチコンソール、ページソース表示）にも触れると親切。

【このデモ・サービスについて】
- 本デモは ITLINE が提供する法人向けAIサービス「**AIでらくらく更新**」の体験版
- インフォネット様の採用ブランディングサイトを題材にしたデモ環境
- すべての機能（お知らせ／求人／ブログ／採用ページ／GA4分析／SEO診断／JSON-LD自動付与）は実装済み・本番稼働中
- 個人でAI契約する場合と違い、**承認フロー・権限管理・操作ログ**を備えた法人運用ができる点が強み

【会社情報】
- 株式会社インフォネット：Webサイト制作・システム開発・DXコンサルティング、東京都港区新橋4-21-3 新橋東急ビル7F
- 株式会社ITLINE：インフォネット様の長年のパートナー企業。本デモの提供元。代表は **小玉知伸（こだま ともゆき）氏**
- 新機能追加・本番導入・カスタマイズ・料金・契約・セキュリティ要件のご相談は ITLINE 小玉まで

【回答のスタイル】
- 敬体・親しみやすく・具体的
- できる／できないを明確に
- 簡潔で読みやすい（3〜6文目安）
- 必要なら絵文字を控えめに使う（😊✨🎯など）`;

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
- 不確実な情報の断定` + DEMO_KNOWLEDGE;

const JOB_SYSTEM_PROMPT = `あなたは「らくらくAI」という、企業の採用ページ更新を支援するAIアシスタントです。

【あなたの役割】
- 担当者からの指示を受け取り、採用ページに掲載する「求人（募集職種）」のドラフトを作成する
- 求職者に向けた、分かりやすく誠実でビジネス的なトーンで書く
- 必ず「職種名（タイトル）」と「本文」の両方を含めて出力する

【出力ルール】
- 必ず以下のJSON形式で応答してください
- JSON以外のテキスト（前置き・後書き・説明）は一切出力しない
- JSONの最初の文字は「{」、最後の文字は「}」でなければなりません
- フォーマット:
{
  "title": "（職種名。30文字以内推奨。例：フロントエンドエンジニア（中途））",
  "body": "（求人本文。次の見出しを必ず「■ 」付きで含める：仕事内容／応募資格／雇用形態／勤務地。指示に情報がない項目は「※詳細は面談時にご案内いたします」とする。200〜600文字程度）",
  "imageKey": "求人原稿のため原則 recruit を選ぶ（maintenance／recruit／relocation／seminar／general から）",
  "chatMessage": "（チャット欄に表示する一言メッセージ）"
}

【文章作成ルール】
- 段落・見出しは適切に改行する
- 給与・勤務時間など指示にない条件は推測で断定しない
- 勤務地が不明な場合は「東京都港区新橋」を用いてよい

【会社情報（参考）】
- 会社名：株式会社インフォネット
- 業種：Webサイト制作・システム開発・DXコンサルティング
- 所在地：東京都港区新橋

【避けるべき表現】
- カジュアルすぎる口語
- 過度に誇張した表現
- 不確実な情報の断定` + DEMO_KNOWLEDGE;

const RECRUIT_SYSTEM_PROMPT = `あなたは「らくらくAI」という、企業の採用ページ作成を支援するAIアシスタントです。

【役割】
- 担当者の指示に沿って、採用ページに掲載する文章（採用メッセージ、社員インタビューのコメント、キャッチコピー等）を作成する
- 求職者に向けた、誠実で前向き、人間味のあるトーンで書く
- 指示で求められた文章の長さ・形式に合わせる（短い一言から数段落まで）

【出力ルール】
- 必ず以下のJSON形式のみで応答する。JSON以外のテキスト（前置き・後書き）は出力しない
{
  "title": "（短い見出し。不要なら空文字）",
  "body": "（依頼された文章の本文）",
  "imageKey": "recruit",
  "chatMessage": "（チャット欄に表示する一言メッセージ）"
}

【会社情報（参考）】
- 会社名：株式会社インフォネット
- 業種：Webサイト制作・システム開発・DXコンサルティング
- 所在地：東京都港区新橋

【避けるべき表現】
- カジュアルすぎる口語、過度な誇張、不確実な情報の断定` + DEMO_KNOWLEDGE;

const BLOG_SYSTEM_PROMPT = `あなたは「らくらくAI」という、企業の採用ブログの記事作成を支援するAIアシスタントです。

【役割】
- 担当者の指示を受け取り、採用ブログに掲載する記事のドラフトを作成する
- 読み手（求職者・社外の方）に向けた、親しみやすく前向きで誠実なトーンで書く

【出力ルール】
- 必ず以下のJSON形式のみで応答する。JSON以外のテキスト（前置き・後書き）は出力しない
- JSONの最初の文字は「{」、最後の文字は「}」
{
  "title": "（記事タイトル。35文字以内推奨）",
  "body": "（記事本文。300〜700文字程度。段落を改行で分ける）",
  "category": "（People／News／Culture／Event から記事内容に最も合うものを1つ）",
  "tags": ["（記事に関連するタグを2〜4個。短い単語で）"],
  "imageKey": "（maintenance／recruit／relocation／seminar／general から内容に最も合うもの）",
  "chatMessage": "（チャット欄に表示する一言メッセージ）"
}

【会社情報（参考）】
- 会社名：株式会社インフォネット（Webサイト制作・システム開発・DXコンサルティング、東京都港区新橋）

【避けるべき表現】
- カジュアルすぎる口語、過度な誇張、不確実な情報の断定` + DEMO_KNOWLEDGE;

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
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、業務拡大に伴い、本社オフィスを下記へ移転する運びとなりました。\n\n■ 新所在地\n〒105-0004 東京都港区新橋4-21-3 新橋東急ビル7F\n\n■ 移転日\n2026年5月1日（金）\n\n今後とも変わらぬご愛顧を賜りますようお願い申し上げます。",
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

// --- 求人モードのモック応答 -----------------------------------------
function buildJobMock(message) {
  const m = String(message || "");
  return {
    imageKey: "recruit",
    title: "募集職種",
    body: "下記のとおり人材を募集いたします。\n\n■ 仕事内容\n" +
      (m ? m + "\n\n" : "Webサイト制作・運用に関わる業務をお任せします。\n\n") +
      "■ 応募資格\n※詳細は面談時にご案内いたします。\n\n■ 雇用形態\n正社員\n\n■ 勤務地\n東京都港区新橋\n\n※この文章はデモ用のサンプル応答です。",
  };
}

// --- 採用ページ文章モードのモック応答 -------------------------------
function buildRecruitMock(message) {
  const m = String(message || "");
  return {
    imageKey: "recruit",
    title: "",
    body: (m ? m + "\n\n" : "") +
      "私たちは、学び続ける意欲を大切にしています。あなたの挑戦を、会社全体で後押しします。\n※この文章はデモ用のサンプル応答です。",
  };
}

// --- ブログ記事モードのモック応答 -----------------------------------
function buildBlogMock(message) {
  const m = String(message || "");
  return {
    imageKey: "general",
    category: "News",
    tags: ["お知らせ", "インフォネット"],
    title: "ブログ記事",
    body: (m ? m + "\n\n" : "") +
      "詳しい内容につきましては、改めてご紹介いたします。\n\n※この文章はデモ用のサンプル応答です。",
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

  // mode="job"（求人）/ "recruit"（採用ページ文章）/ "blog"（ブログ）/ それ以外はお知らせ
  const mode = payload.mode;
  const systemPrompt = mode === "job" ? JOB_SYSTEM_PROMPT
    : mode === "recruit" ? RECRUIT_SYSTEM_PROMPT
    : mode === "blog" ? BLOG_SYSTEM_PROMPT
    : SYSTEM_PROMPT;
  const mockFn = mode === "job" ? buildJobMock
    : mode === "recruit" ? buildRecruitMock
    : mode === "blog" ? buildBlogMock
    : buildMock;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const expired = isExpired();

  // --- モードA: モック（キー未設定 / デモ期間終了）-----------------
  if (!apiKey || expired) {
    const mock = mockFn(userMessage);
    return json({
      title: mock.title,
      body: mock.body,
      imageKey: mock.imageKey,
      category: mock.category,
      tags: mock.tags,
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
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        temperature: 0.5,
        system: systemPrompt,
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
      category: parsed.category,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      chatMessage:
        parsed.chatMessage ||
        "ドラフトを作成しました。右側のプレビューでご確認ください。",
      tokensUsed:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
      mode: "live",
    });
  } catch (err) {
    // --- モードC: API障害時はモックへ自動フォールバック --------------
    const mock = mockFn(userMessage);
    return json({
      title: mock.title,
      body: mock.body,
      imageKey: mock.imageKey,
      category: mock.category,
      tags: mock.tags,
      chatMessage:
        "AIとの通信が混み合っているため、サンプル原稿を表示しています。内容はそのままご利用いただけます。",
      tokensUsed: 0,
      model: "デモモック（自動切替）",
      mode: "fallback",
      note: String(err),
    });
  }
};
