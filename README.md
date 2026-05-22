# 法人用AIデモ｜AIでらくらく更新（インフォネット様向け）

株式会社ITLINE が、パートナーである株式会社インフォネット様へ「法人向けAIサービス」を
体感いただくためのデモアプリです。

- **公開LP**：架空の「株式会社インフォネット」公式サイト（お知らせ欄が更新対象）
- **管理画面**：チャットでAIに指示 → 原稿生成 → 確認・編集 → 下書き/公開、操作ログも記録

---

## 画面構成

| URL | 画面 |
|---|---|
| `/` | 公開LP（インフォネット風サイト） |
| `/news.html?id=xxx` | お知らせ詳細 |
| `/admin/` | 管理画面ログイン |
| `/admin/dashboard.html` | ダッシュボード |
| `/admin/news.html` | ニュース更新（AIチャット）★中核機能 |
| `/admin/drafts.html` | 下書き一覧 |
| `/admin/published.html` | 公開済み一覧 |
| `/admin/logs.html` | ログ・履歴 |

ログインはメール・パスワードに任意の文字列でOK（デモ用簡易ログイン）。

---

## ローカルでの確認

### かんたん確認（サーバー不要）
`public/index.html` をブラウザで開くだけで、一通りの操作が可能です。
この場合データはブラウザの localStorage に保存され、AI生成はサンプル応答（モック）になります。

### 本番に近い確認（Netlify CLI）
```
npm install -g netlify-cli
netlify dev
```
→ Netlify Functions と Netlify Blobs が動作し、本物のAI生成も確認できます。

---

## Netlify へのデプロイ

1. このフォルダを GitHub リポジトリにプッシュ（または Netlify に直接アップロード）
2. Netlify で新規サイトを作成し、このリポジトリを連携
3. ビルド設定は `netlify.toml` で自動認識されます（publish: `public` / functions: `netlify/functions`）
4. **環境変数を設定**（Netlify管理画面 → Site settings → Environment variables）

| 変数名 | 内容 | 必須 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API キー（`sk-ant-...`）。お知らせ原稿のAI生成に使用 | 原稿のライブ生成に必要 |
| `GEMINI_API_KEY` | Gemini API キー。サムネイル画像のAI生成に使用 | 画像のライブ生成に必要 |
| `DEMO_EXPIRES_AT` | デモ終了日時（ISO形式 例：`2026-06-01T00:00:00Z`） | 任意 |

- いずれのキーも未設定でデモは動作します（原稿はサンプル応答、画像は固定ライブラリに自動切替）
- API障害時も自動でフォールバックするため、デモ中に止まりません

---

## 「1週間だけ」AIを使えるようにする（ご依頼④）

環境変数 `DEMO_EXPIRES_AT` に終了日時を設定すると、その日時を過ぎた後は
AI生成が自動的にサンプル応答へ切り替わります（サイト自体は閲覧可能なまま）。

例：デモ公開から1週間後に停止する場合
```
DEMO_EXPIRES_AT = 2026-06-01T00:00:00Z
```

完全に停止したい場合は、Netlify でサイトを Unpublish するか
`ANTHROPIC_API_KEY` を削除してください。

---

## ロゴ・社名の差し替え（ご依頼②）

管理画面のロゴ・社名は **1ファイルの設定だけ** で変更できます。
クライアントに合わせて見せ方を変える際は、以下を編集してください。

`public/assets/admin.js` の冒頭：
```js
const BRAND = {
  name: "INFONET",                  // ロゴに表示する英字
  fullName: "株式会社インフォネット",   // 正式社名
  logoImage: null,                  // 画像ロゴを使う場合はパスを指定
  productName: "AIでらくらく更新",     // 管理画面の副題
};
```

画像ロゴを使う場合：
1. 画像を `public/assets/` に置く（例：`client-logo.png`）
2. `logoImage: "/assets/client-logo.png"` と設定

※ ログイン画面 (`public/admin/index.html`) もこの設定を自動で参照します。

---

## お知らせのサムネイル画像（AI生成）

ニュース更新画面でお知らせ原稿を生成すると、続けて **Gemini が記事内容に合うサムネイル画像をその場で生成**します（`GEMINI_API_KEY` 設定時）。原稿を先に表示し、画像は後から差し込む方式で体感速度を保っています。

画像生成が無効・失敗・デモ期間外のときは、`public/assets/news/` に同梱した **固定ライブラリ画像5種**（`maintenance` / `recruit` / `relocation` / `seminar` / `general`）に自動フォールバックします。ニュース更新画面のサムネイル一覧から、ライブラリ画像へ手動で差し替えることも可能です。

固定ライブラリ画像を差し替える場合は、同名ファイルを `public/assets/news/` に置き換えてください。

---

## デモデータのリセット

ダッシュボード右下の「デモデータをリセット」ボタンで、
作成したお知らせ・ログを初期状態（お知らせ3件）に戻せます。
デモの前後にご利用ください。

---

## 技術構成

- フロントエンド：HTML + Tailwind CSS(CDN) + バニラJS
- バックエンド：Netlify Functions（`netlify/functions/*.mjs`）
- データ保存：Netlify Blobs（サーバー稼働時）／ localStorage（フォールバック時）
- AI：Anthropic Claude API（`claude-sonnet-4-6`）／ モック自動切替

---

株式会社ITLINE ソリューション部 カスタマーサポート課
