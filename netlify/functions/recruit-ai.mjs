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
  "sectionText": {
    "visionHeading": "ビジョンセクションの見出し（例: テクノロジーで、まだ見ぬ最適解を導く。）",
    "positionsHeading": "募集職種セクションの見出し（例: 募集中のミッション）",
    "positionsLead": "募集職種セクションのリード文",
    "interviewHeading": "社員インタビューセクションの見出し",
    "statsHeading": "数字セクションの見出し",
    "benefitsHeading": "福利厚生セクションの見出し",
    "flowHeading": "選考フローセクションの見出し",
    "blogHeading": "ブログセクションの見出し",
    "ctaHeading": "CTAセクションの大見出し",
    "ctaSubtext": "CTAセクションの本文"
  },
  "flowSteps": [ { "phase": "PHASE 01", "title": "エントリー", "desc": "..." }, ... ],
  "styleOverrides": {
    "<キー名>": { "fontSize": "3rem", "lineHeight": "1.4", "color": "#0052FF", ... }
  },
  "chatMessage": "担当者への報告メッセージ",
  "applyAttachedImage": "（任意）添付画像を採用ページの画像として使う場合の指定"
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

【画像が添付されている場合】
担当者の意図は次の2パターンに分かれます。区別して対応してください。

(A) 添付画像を**そのまま採用ページの画像として使いたい**場合
- 指示例：「メインビジュアルをこの画像にして」「ヒーロー背景にこれを使って」「○○さんの社員写真をこれに差し替えて」「ビジョンセクションにテック感の画像を入れて」
- このときは、応答JSONに次のキーだけ含めてください（他のデータキーは触らない）：
  - "applyAttachedImage": 値は以下のいずれか
    - "mvImage" … 添付画像をメインビジュアル背景として使用
    - "interview:<id>" … 添付画像を特定の社員インタビュー写真として使用（例：interview:iv-1）
    - "section:vision" … OUR VISIONセクションの装飾背景画像として使用
    - "section:positions" … OPEN POSITIONSセクションの装飾背景画像として使用
    - "section:interview" … CREATORS & ENGINEERSセクションの装飾背景画像として使用
    - "section:benefits" … WORK ENVIRONMENTセクションの装飾背景画像として使用
    - "section:flow" … RECRUITMENT PIPELINEセクションの装飾背景画像として使用
    - "section:blog" … INSIDE STORIESセクションの装飾背景画像として使用
  - "chatMessage": 「添付画像を○○セクションの背景に設定しました」等の報告
- 画像データ本体は出力しないでください（フロントエンドが処理します）
- どのセクションか不明確な場合は、chatMessage で確認すること（勝手に mvImage を選んで上書きしない）

(B) 添付画像を**参考・指示の手がかり**として使う場合（直すべき箇所を画像で示している）
- 指示例：「赤丸の部分を緑に」「ここの改行を直して」「この部分を変更」
- 画像内の矢印・赤丸・ハイライト・「ここ」表記から該当箇所を特定し、対応するデータキー（mvTitle/mvSubtitle/message/sectionThemes/positionsStyle 等）を編集してください
- 画像から色・配置・改行位置などのデザイン意図も読み取り、可能ならプリセットにマッピング
- 指示文が短くても（例：「これ直して」「ここ緑」）、画像から読み取った情報で補ってください

判別のヒント：「この画像を使って／差し替え／背景に」=(A)、「ここを直して／変更／改善」=(B)。
どちらか判別できない場合は、chatMessage で「この画像を背景として使う？それとも参考画像？」と丁寧に確認してください。

【改行・レイアウト】
- mvTitle / mvSubtitle / message に "\n"（改行コード）を入れると、その位置で表示が改行されます
- 「改行がおかしい」「テキストが折り返す位置が変」「ここで改行したい」「○○の前で改行」などの指示は、適切な位置に "\n" を入れて返してください
- 「メインビジュアルのテキスト」と言われたら通常は **mvTitle**（大きなキャッチコピー）のことです。サブテキストは mvSubtitle として区別してください
- 自然な改行位置の例：句読点（「、」「。」）の直後、意味のかたまりの区切り
- 例：「メインビジュアルの改行を直して」で mvTitle が「好奇心を、仕事にする。」なら → {"mvTitle": "好奇心を、\n仕事にする。"}

【採用ページの編集可能データ（テキスト → 対応キー）】
ページ上のテキストはほぼすべて以下のキーで編集できます。画像や指示でどのテキストを指しているかを判別し、対応するキーを編集してください。

★ヒーロー（メインビジュアル）
- mvTitle ：大見出し（標準：「好奇心を、仕事にする。」）
- mvSubtitle ：サブテキスト

★ビジョン（OUR VISION）
- sectionText.visionHeading ：見出し（標準：「テクノロジーで、まだ見ぬ最適解を導く。」）
- message ：本文の段落（カード内）

★募集職種（OPEN POSITIONS）
- sectionText.positionsHeading ：見出し（標準：「募集中のミッション」）
- sectionText.positionsLead ：見出し横のリード文

★社員インタビュー（CREATORS & ENGINEERS）
- sectionText.interviewHeading ：見出し（標準：「未来を創る、メンバーの鼓動」）
- interviews ：カード内容

★数字（INFONET DATA）
- sectionText.statsHeading ：見出し（標準：「データで見る、インフォネット」）
- stats ：数値とラベル

★福利厚生（WORK ENVIRONMENT）
- sectionText.benefitsHeading ：見出し（標準：「自律とパフォーマンスを最大化」）
- benefits ：項目

★選考フロー（RECRUITMENT PIPELINE）
- sectionText.flowHeading ：見出し（標準：「ジョインまでのステップ」）
- flowSteps ：4ステップ配列 [{phase, title, desc}, ...]。配列の最後の要素は強調カラー（青グラデ）で描画されます。ステップの追加・削除・並べ替えも可

★ブログ（INSIDE STORIES）
- sectionText.blogHeading ：見出し（標準：「インフォネットのテック＆カルチャー」）

★CTA（BUILD THE NEXT GENERATION）
- sectionText.ctaHeading ：大見出し
- sectionText.ctaSubtext ：本文

★全体のデザイン
- sectionThemes ：各セクション背景色
- positionsStyle ：募集職種カードのレイアウト
- styleOverrides ：要素ごとのフォントサイズ・行間・色などのスタイル上書き（後述）

【今もAIで編集できないもの（=ページデザインの構造）】
- 英字ラベル（NEXT-GEN WEB STRATEGY / OUR VISION / OPEN POSITIONS / PHASE 01-04 など）
- ヘッダーのナビゲーション、フッター、ロゴ、DEMO バッジ
これらの変更要望が来たら chatMessage で「ITLINE 小玉までご相談ください」と案内。それ以外の和文テキストは上記キーで編集可能。

【styleOverrides ─ フォントサイズや色の調整】
各テキストのフォントサイズや行間を変更できます。
例：「メインビジュアルの文字を小さく」→ {"styleOverrides": {"mvTitle": {"fontSize": "3rem"}}}
例：「ビジョンの見出しの行間を広く」→ {"styleOverrides": {"visionHeading": {"lineHeight": "1.6"}}}
キーは編集データ名と同じ（mvTitle / mvSubtitle / message / visionHeading / positionsHeading / positionsLead / interviewHeading / statsHeading / benefitsHeading / flowHeading / blogHeading / ctaHeading / ctaSubtext）。
許可される CSS プロパティ：fontSize / fontWeight / textAlign / color / letterSpacing / lineHeight のみ。値は CSS 文字列（"3rem", "16px", "#0052FF", "1.5" など）。

【画像で指示されたとき】
画像内のテキストが現在の各キーの値のどれと対応するかを慎重に判別してください。current.sectionText 等の現在値を見て、画像内のテキストと一致するキーを選び、そのキーだけを更新します。mvTitle と sectionText.visionHeading のように似た文字構造のものがあるので、現在の値を見比べて間違えないこと。

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
  if (c.sectionImages && typeof c.sectionImages === "object") {
    Object.keys(c.sectionImages).forEach((k) => {
      if (typeof c.sectionImages[k] === "string" && c.sectionImages[k].startsWith("data:")) {
        c.sectionImages[k] = IMG_PLACEHOLDER;
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
  if (merged.sectionImages && typeof merged.sectionImages === "object" &&
      original.sectionImages && typeof original.sectionImages === "object") {
    Object.keys(merged.sectionImages).forEach((k) => {
      if (merged.sectionImages[k] === IMG_PLACEHOLDER && original.sectionImages[k]) {
        merged.sectionImages[k] = original.sectionImages[k];
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
  // 担当者が「ここを直して」と画像で示すための参考画像（任意・data URL）
  let attachedImage = null;
  if (typeof payload.attachedImage === "string") {
    const m = payload.attachedImage.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/);
    if (m) {
      attachedImage = { media_type: m[1] === "image/jpg" ? "image/jpeg" : m[1], data: m[2] };
    }
  }
  if (!instruction && !attachedImage) return json({ error: "指示文を入力してください" }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || isExpired()) {
    return json({
      error: isExpired()
        ? "本デモのAI更新期間は終了しました。"
        : "AIによる更新は現在利用できません（APIキー未設定）。",
    });
  }

  try {
    const textBlock =
      "現在の採用ページ内容（JSON）：\n" +
      JSON.stringify(stripDataUrls(current)) +
      "\n\n担当者からの指示：\n" +
      (instruction || "添付画像の指示どおりに修正してください。") +
      (attachedImage
        ? "\n\n（上記の添付画像をよく見て、画像内で示されている箇所・色・レイアウト・矢印・赤丸などを手がかりに、JSONのどのキーを直すべきか判断してください。）"
        : "");

    // 添付画像があればビジョン入力として渡す
    const content = [];
    if (attachedImage) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: attachedImage.media_type, data: attachedImage.data },
      });
    }
    content.push({ type: "text", text: textBlock });

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
        messages: [{ role: "user", content }],
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

    // applyAttachedImage は「添付画像を○○として使う」というフロント側への指示。保存データには含めない
    const applyAttachedImage =
      typeof parsed.applyAttachedImage === "string" && parsed.applyAttachedImage.trim()
        ? parsed.applyAttachedImage.trim()
        : null;
    delete parsed.applyAttachedImage;

    // AIは「変更したキーだけ」を返すため、現在の内容にマージして全体を組み立てる
    const recruit = { ...current, ...parsed };
    // 以下のオブジェクト系は一部のキーだけ返ることがあるため、現在値と深くマージする
    if (parsed.sectionThemes && typeof parsed.sectionThemes === "object") {
      recruit.sectionThemes = { ...(current.sectionThemes || {}), ...parsed.sectionThemes };
    }
    if (parsed.sectionText && typeof parsed.sectionText === "object") {
      recruit.sectionText = { ...(current.sectionText || {}), ...parsed.sectionText };
    }
    if (parsed.styleOverrides && typeof parsed.styleOverrides === "object") {
      recruit.styleOverrides = { ...(current.styleOverrides || {}), ...parsed.styleOverrides };
    }
    if (parsed.sectionImages && typeof parsed.sectionImages === "object") {
      recruit.sectionImages = { ...(current.sectionImages || {}), ...parsed.sectionImages };
    }
    // 画像目印 [IMG] が AI から返ってきた場合は元の画像URLに戻す
    restoreImages(recruit, current);

    return json({
      recruit,
      chatMessage,
      applyAttachedImage,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: "claude-sonnet-4-6",
    });
  } catch (err) {
    return json({ error: "AI更新に失敗しました。もう一度お試しください。", details: String(err) }, 200);
  }
};
