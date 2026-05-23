// =============================================================
//  /api/recruit-ai ─ 採用ページ内容をAIに直接指示して更新
//  POST { instruction, current } → { recruit: 更新後のJSON } / { error }
// =============================================================

const SYSTEM_PROMPT = `あなたは「らくらくAI」、株式会社インフォネット様の採用ページを編集するAIアシスタントです。
担当者からの「指示」と「質問・相談」の両方に応じます。
- 指示（編集依頼）の場合：現在の採用ページ内容（JSON）を受け取り、「変更が必要な項目だけ」を含むJSONを返します。
- 質問・相談の場合：データのキーは一切変更せず、"chatMessage" だけで的確に答えます（後述【役割の拡張：質問・相談への対応】参照）。

【JSONスキーマ（トップレベルのキー）】
{
  "mvTitle": "メインビジュアルのキャッチコピー（文字列）",
  "mvSubtitle": "メインビジュアルのサブテキスト（文字列）",
  "message": "採用メッセージ本文（文字列・改行可）",
  "interviews": [ { "id": "...", "name": "氏名", "role": "職種・入社年", "comment": "インタビュー本文", "image": "画像キー" } ],
  "stats": [ { "label": "項目名", "value": "数値" } ],
  "benefits": [ { "title": "制度名", "desc": "説明" } ],
  "sectionThemes": { "message": "テーマ名", "positions": "テーマ名", "interview": "テーマ名", "benefits": "テーマ名", "flow": "テーマ名", "blog": "テーマ名" },
  "positionsStyle": "募集職種カードのレイアウト名",
  "chatMessage": "担当者への報告メッセージ"
}

【sectionThemes ─ セクションの配色（背景デザイン）】
各セクションの背景の配色を、次のプリセットから選んで指定できます。
- "default"：標準（白／薄いグレー）
- "green"：やわらかい緑。自然・環境・サステナブルさが伝わる配色
- "blue"：落ち着いた青。誠実・信頼の印象
- "warm"：あたたかいクリーム色。親しみやすい印象
- "gray"：ニュートラルなグレー
sectionThemes のキーと対応セクション：
  message=採用メッセージ／positions=募集職種／interview=社員インタビュー／
  benefits=福利厚生・働く環境／flow=選考フロー／blog=ブログ
背景色・配色・デザインの雰囲気に関する指示は、必ずこの sectionThemes で表現すること。
変更するセクションのキーだけを含めればよい。
例：「福利厚生の背景を緑にして自然が伝わるデザインに」→ {"sectionThemes": {"benefits": "green"}}

【positionsStyle ─ 募集職種カードのレイアウト】
募集職種（求人）カードの見た目を、次のプリセットから選んで指定できます。
- "default"：3列の標準カード（画面幅により折り返す）
- "wide"：2列の幅広カード。上部にアクセントライン・角丸大きめ・やわらかい影
- "horizontal"：横長カード（画像が左、職種名・本文が右）
- "row"：縦型カードを横一列に並べる（1行に横並び・上部アクセントライン付き）。「横1列に」「1行に並べて」「横並びに」などの指示はこれ
募集職種カードの横幅・枠・縁・レイアウト・並び方に関する指示は、必ずこの positionsStyle で表現すること。
例：「募集職種の枠を横に大きくして、縁をおしゃれに」→ {"positionsStyle": "wide"}
例：「募集職種を横1列に並べて」→ {"positionsStyle": "row"}

【最重要ルール｜出力を最小限にする】
- 指示によって変更が必要なトップレベルのキーだけを出力する
- 変更しないキーは出力に一切含めない（例：メッセージだけを直す指示なら、出力は {"message": "..."} のみ）
- 配列（interviews / stats / benefits）を変更する場合のみ、その配列を「全要素そろえて」出力する（変更しない要素も省略せず含める）
- これは応答速度のために重要なルールです。必ず守ること
- ただし "chatMessage" は毎回必ず含めること。これは保存データではなく、担当者に「何をどう変更したか」を伝える短い日本語の報告文です（1〜2文・敬体・親しみやすく）
- 指示が採用ページの編集と無関係、または対応できない内容のときは、データのキーは一切変更せず "chatMessage" だけで丁寧に説明する

【編集ルール】
- 社員インタビューを追加する場合、id は "iv-" + 適当な英数字、image は "recruit" とする
- image フィールドは、画像に関する指示がない限り元の値をそのまま保持する
- 文章は求職者向けの誠実で前向きなトーンで書く
- 出力は更新後のJSONオブジェクトのみ。説明・前置き・後書きは一切出力しない
- JSONの最初の文字は「{」、最後の文字は「}」でなければならない

【会社情報（参考）】
- 株式会社インフォネット：Webサイト制作・システム開発・DXコンサルティング、東京都港区新橋。本デモの公開先・採用ページの主体。
- 株式会社ITLINE：インフォネット様の長年のパートナー企業。法人向けAIサービス「AIでらくらく更新」を提供。本デモを制作・運用。代表は 小玉知伸（こだま ともゆき）氏。
- AIでらくらく更新：ITLINE が提供する法人向けAIサービス。AIに話しかけるだけでWebサイトを更新でき、承認フロー・権限管理・操作ログなど企業利用に必要な機能を備える。個人でAIを契約するのとは別物。

【役割の拡張：質問・相談への対応】
担当者から編集ではなく「質問」「相談」「雑談」を投げられたときは、データのキーは出力せず "chatMessage" だけで丁寧に答えてください。判断の指針：

(A) **ITLINEに相談すべきこと**（chatMessageでITLINE／小玉氏への相談を案内）：
- 新機能の追加、本番導入、別ページ・別サイトへの応用、デザインの大幅変更
- 採用ページ以外（お知らせ・求人・ブログ・社内システム連携など）の本格カスタマイズ
- 料金・契約・運用体制・セキュリティ要件・SLA
- AI機能の不具合や仕様の制約に関する相談
- 「ITLINEに相談したほうがよいか？」と聞かれたら、相談内容次第で適切な窓口を案内（編集の話なら私で対応／それ以外はITLINEへ、と切り分けて伝える）

(B) **このAIで対応できること**（chatMessageで対応可と回答 or その場で実行）：
- 採用ページの文章書き換え、社員インタビュー追加、数字や福利厚生の編集
- セクションの背景色（sectionThemes）、募集職種カードのレイアウト（positionsStyle）の変更
- メインビジュアルの背景画像生成（ユーザー側のチェックボックス操作で起動）

(C) **デモ・サービスについての質問**：このデモは「ITLINEが提供する法人AIサービス『AIでらくらく更新』」の体験版で、AIに話しかけて採用ページを編集できる、と簡潔に説明。

回答スタイル：1〜3文の敬体、親しみやすく、必要なら次の一手（「○○とおっしゃっていただければ私が対応します」「ITLINE 小玉までご相談ください」など）を添える。`;

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

// データURL画像（巨大な base64 文字列）は Claude API のリクエスト制限を超えるため、
// AIに送る current からは短い目印に置き換える。
// AIからの応答で目印が返ってきた箇所は、元の画像URLに復元する。
const IMG_PLACEHOLDER = "[IMG]";
function stripDataUrls(obj) {
  const c = JSON.parse(JSON.stringify(obj));
  if (typeof c.mvImage === "string" && c.mvImage.startsWith("data:")) {
    c.mvImage = IMG_PLACEHOLDER;
  }
  if (Array.isArray(c.interviews)) {
    c.interviews.forEach((iv) => {
      if (iv && typeof iv.image === "string" && iv.image.startsWith("data:")) {
        iv.image = IMG_PLACEHOLDER;
      }
    });
  }
  return c;
}
function restoreImages(merged, original) {
  if (!merged) return;
  if (merged.mvImage === IMG_PLACEHOLDER && original.mvImage) {
    merged.mvImage = original.mvImage;
  }
  if (Array.isArray(merged.interviews) && Array.isArray(original.interviews)) {
    const byId = {};
    original.interviews.forEach((iv) => { if (iv && iv.id) byId[iv.id] = iv.image; });
    merged.interviews.forEach((iv) => {
      if (iv && iv.image === IMG_PLACEHOLDER && iv.id && byId[iv.id]) {
        iv.image = byId[iv.id];
      }
    });
  }
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
      JSON.stringify(stripDataUrls(current)) +
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("AI応答のフォーマットが不正です");
    }

    // chatMessage は担当者への報告用。保存データには含めない
    const chatMessage =
      typeof parsed.chatMessage === "string" && parsed.chatMessage.trim()
        ? parsed.chatMessage.trim()
        : "採用ページを更新しました。";
    delete parsed.chatMessage;

    // AIは「変更したキーだけ」を返すため、現在の内容にマージして全体を組み立てる
    const recruit = { ...current, ...parsed };
    // sectionThemes は一部のキーだけ返ることがあるため、現在値と深くマージする
    if (parsed.sectionThemes && typeof parsed.sectionThemes === "object") {
      recruit.sectionThemes = {
        ...(current.sectionThemes || {}),
        ...parsed.sectionThemes,
      };
    }
    // 画像目印 [IMG] が AI から返ってきた場合は元の画像URLに戻す
    restoreImages(recruit, current);

    return json({
      recruit,
      chatMessage,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
    });
  } catch (err) {
    return json({ error: "AI更新に失敗しました。もう一度お試しください。", details: String(err) }, 200);
  }
};
