/* =============================================================
 *  法人用AIデモ ─ クライアント データ層（Store）
 *
 *  Netlify Functions（/api/*）を最優先で利用し、サーバーが
 *  使えない場合は localStorage ＋ クライアント側モックに
 *  自動フォールバックします。
 *  → ファイルを直接開いただけでもデモが一通り動作します。
 *    （デモ当日にエラーで止まらないための安全網）
 * ============================================================= */
(function () {
  const API = "/api";
  const H = { "content-type": "application/json" };
  const NEWS_KEY = "infonet_demo_news";
  const LOGS_KEY = "infonet_demo_logs";

  /* ---- AI生成サムネイル画像ライブラリ ---- */
  const IMAGE_KEYS = ["maintenance", "recruit", "relocation", "seminar", "general"];
  const IMAGE_LABELS = {
    maintenance: "メンテナンス・障害",
    recruit: "採用・募集",
    relocation: "移転・拠点",
    seminar: "セミナー・イベント",
    general: "お知らせ全般",
  };
  function imageUrl(key) {
    // データURL（AI生成画像）や外部URLはそのまま返す
    if (typeof key === "string" && (key.startsWith("data:") || key.startsWith("http"))) {
      return key;
    }
    return "/assets/news/" + (IMAGE_KEYS.includes(key) ? key : "general") + ".webp";
  }
  // image の値を正規化（AI生成画像のデータURL or ライブラリキー）
  function normalizeImage(v) {
    if (typeof v === "string" && v.startsWith("data:image/")) return v;
    return IMAGE_KEYS.includes(v) ? v : "general";
  }

  /* ---- 初期お知らせ（news.mjs のシードと同一）---- */
  const SEED = [
    {
      id: "seed-001",
      title: "Webサイト制作の新プラン提供を開始しました",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、中小企業様向けにWebサイト制作の新プラン「クイックスタートプラン」の提供を開始いたしました。\n\n短納期・低コストでコーポレートサイトを立ち上げたいお客様に最適なプランです。\n\n詳細はお問い合わせフォームよりお気軽にご相談ください。",
      image: "general",
      status: "published", authorId: "demo-user-01", authorName: "インフォネット担当者",
      createdAt: "2026-05-07T01:00:00.000Z", updatedAt: "2026-05-07T01:00:00.000Z", publishedAt: "2026-05-07T01:00:00.000Z",
    },
    {
      id: "seed-002",
      title: "ゴールデンウィーク休業のお知らせ",
      body: "平素より格別のご高配を賜り、厚く御礼申し上げます。\n\n誠に勝手ながら、下記の期間をゴールデンウィーク休業とさせていただきます。\n\n■ 休業期間\n2026年5月3日（日）〜 5月6日（水）\n\n休業期間中にいただいたお問い合わせは、5月7日（木）以降に順次対応いたします。\n\nご不便をおかけいたしますが、何卒よろしくお願い申し上げます。",
      image: "general",
      status: "published", authorId: "demo-user-01", authorName: "インフォネット担当者",
      createdAt: "2026-04-22T02:00:00.000Z", updatedAt: "2026-04-22T02:00:00.000Z", publishedAt: "2026-04-22T02:00:00.000Z",
    },
    {
      id: "seed-003",
      title: "本社オフィス移転のお知らせ",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、業務拡大に伴い、本社オフィスを下記へ移転いたしました。\n\n■ 新所在地\n東京都千代田区丸の内1-1-1 インフォネットビル\n\n■ 移転日\n2026年4月15日（水）\n\n今後とも変わらぬご愛顧を賜りますようお願い申し上げます。",
      image: "relocation",
      status: "published", authorId: "demo-user-01", authorName: "インフォネット担当者",
      createdAt: "2026-04-15T00:00:00.000Z", updatedAt: "2026-04-15T00:00:00.000Z", publishedAt: "2026-04-15T00:00:00.000Z",
    },
  ];

  /* ---- localStorage ヘルパー ---- */
  function lsGetNews() {
    try {
      const raw = localStorage.getItem(NEWS_KEY);
      if (raw == null) {
        localStorage.setItem(NEWS_KEY, JSON.stringify(SEED));
        return SEED.map((n) => ({ ...n }));
      }
      return JSON.parse(raw);
    } catch {
      return SEED.map((n) => ({ ...n }));
    }
  }
  function lsSetNews(list) { try { localStorage.setItem(NEWS_KEY, JSON.stringify(list)); } catch {} }
  function lsGetLogs() {
    try { const r = localStorage.getItem(LOGS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  }
  function lsSetLogs(list) { try { localStorage.setItem(LOGS_KEY, JSON.stringify(list)); } catch {} }

  function sortRecency(list) {
    return [...list].sort((a, b) => {
      const ka = a.publishedAt || a.updatedAt || a.createdAt || "";
      const kb = b.publishedAt || b.updatedAt || b.createdAt || "";
      return kb.localeCompare(ka);
    });
  }

  /* ---- クライアント側モック（generate.mjs と同等の簡易版）---- */
  function buildMock(message) {
    const m = String(message || "");
    if (/メンテ|サーバー|停止|障害/.test(m)) {
      return { imageKey: "maintenance", title: "サーバーメンテナンス実施のお知らせ",
        body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、サービス品質向上のため、下記日程にてサーバーメンテナンスを実施いたします。\n\n■ 実施日時\n2026年5月26日（月）9:00〜12:00\n\n■ 影響範囲\nメンテナンス中は一時的にサービスをご利用いただけません。\n\nお客様にはご不便をおかけいたしますが、何卒ご理解とご協力を賜りますようお願い申し上げます。\n※詳細は別途ご案内いたします。" };
    }
    if (/採用|求人|エントリー|新卒|中途/.test(m)) {
      return { imageKey: "recruit", title: "新卒採用エントリー受付開始のお知らせ",
        body: "平素より弊社に格別のご高配を賜り、厚く御礼申し上げます。\n\nこの度、新卒採用のエントリー受付を開始いたしました。\n\n■ 募集職種\nWebエンジニア／Webデザイナー／ディレクター\n\n■ エントリー締切\n2026年6月30日（火）\n\nご応募を心よりお待ちしております。\n※詳細は採用ページをご確認ください。" };
    }
    if (/移転|オフィス|引っ越し|住所/.test(m)) {
      return { imageKey: "relocation", title: "本社オフィス移転のお知らせ",
        body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、業務拡大に伴い、本社オフィスを下記へ移転する運びとなりました。\n\n■ 新所在地\n東京都千代田区丸の内1-1-1\n\n■ 移転日\n2026年5月1日（金）\n\n今後とも変わらぬご愛顧を賜りますようお願い申し上げます。" };
    }
    if (/セミナー|イベント|ウェビナー|説明会|開催/.test(m)) {
      return { imageKey: "seminar", title: "オンラインセミナー開催のお知らせ",
        body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\nこの度、下記のとおりオンラインセミナーを開催いたします。\n\n■ テーマ\n企業のWebサイトとAI活用\n\n■ 開催日時\n2026年6月15日（月）14:00〜15:30\n\n■ 参加費\n無料（要事前申込）\n\n皆さまのご参加を心よりお待ちしております。" };
    }
    return { imageKey: "general", title: "お知らせ",
      body: "平素より弊社サービスをご利用いただき、誠にありがとうございます。\n\n" + (m ? m + "\n\n" : "") + "詳細につきましては、改めてご案内いたします。\n\n今後とも何卒よろしくお願い申し上げます。\n※この文章はデモ用のサンプル応答です。" };
  }

  /* ---- fetch ラッパ（失敗時は throw してフォールバックへ）---- */
  async function tryFetch(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  /* ---- 公開API ---- */
  const Store = {
    mode: "unknown", // "api"（サーバー稼働）/ "local"（フォールバック）

    async listNews(status) {
      try {
        const url = status ? `${API}/news?status=${status}` : `${API}/news`;
        const data = await tryFetch(url);
        this.mode = "api";
        return data;
      } catch {
        this.mode = "local";
        let list = lsGetNews();
        if (status) list = list.filter((n) => n.status === status);
        return sortRecency(list);
      }
    },

    async getNews(id) {
      try {
        return await tryFetch(`${API}/news?id=${encodeURIComponent(id)}`);
      } catch {
        return lsGetNews().find((n) => n.id === id) || null;
      }
    },

    async createNews(data) {
      try {
        return await tryFetch(`${API}/news`, { method: "POST", headers: H, body: JSON.stringify(data) });
      } catch {
        const list = lsGetNews();
        const now = new Date().toISOString();
        const pub = data.status === "published";
        const item = {
          id: "n-" + Date.now().toString(36),
          title: (data.title || "無題のお知らせ").trim(),
          body: data.body || "",
          image: normalizeImage(data.image),
          status: pub ? "published" : "draft",
          authorId: "demo-user-01",
          authorName: data.authorName || "インフォネット担当者",
          createdAt: now, updatedAt: now, publishedAt: pub ? now : undefined,
        };
        list.push(item);
        lsSetNews(list);
        return item;
      }
    },

    async updateNews(id, data) {
      try {
        return await tryFetch(`${API}/news?id=${encodeURIComponent(id)}`, { method: "PUT", headers: H, body: JSON.stringify(data) });
      } catch {
        const list = lsGetNews();
        const i = list.findIndex((n) => n.id === id);
        if (i < 0) throw new Error("記事が見つかりません");
        const now = new Date().toISOString();
        const prev = list[i];
        const next = { ...prev, updatedAt: now };
        if ("title" in data) next.title = (data.title || "無題のお知らせ").trim();
        if ("body" in data) next.body = data.body;
        if ("image" in data) next.image = normalizeImage(data.image);
        if (data.status && data.status !== prev.status) {
          next.status = data.status;
          if (data.status === "published") next.publishedAt = now;
        }
        list[i] = next;
        lsSetNews(list);
        return next;
      }
    },

    async deleteNews(id) {
      try {
        return await tryFetch(`${API}/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {
        lsSetNews(lsGetNews().filter((n) => n.id !== id));
        return { ok: true };
      }
    },

    async listLogs() {
      try {
        return await tryFetch(`${API}/logs`);
      } catch {
        return lsGetLogs().sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      }
    },

    async addLog(data) {
      try {
        return await tryFetch(`${API}/logs`, { method: "POST", headers: H, body: JSON.stringify(data) });
      } catch {
        const list = lsGetLogs();
        const item = {
          id: "l-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          timestamp: new Date().toISOString(),
          userId: "demo-user-01",
          userName: data.userName || "インフォネット担当者",
          action: data.action || "edit",
          targetId: data.targetId, targetTitle: data.targetTitle,
          aiModel: data.aiModel, userPrompt: data.userPrompt,
          aiOutput: data.aiOutput, tokensUsed: data.tokensUsed,
        };
        list.push(item);
        lsSetLogs(list);
        return item;
      }
    },

    async resetDemo() {
      try {
        await fetch(`${API}/news?reset=1`, { method: "DELETE" });
        await fetch(`${API}/logs?reset=1`, { method: "DELETE" });
      } catch {}
      lsSetNews(SEED.map((n) => ({ ...n })));
      lsSetLogs([]);
    },

    async generate(userMessage, conversationHistory) {
      try {
        return await tryFetch(`${API}/generate`, {
          method: "POST", headers: H,
          body: JSON.stringify({ userMessage, conversationHistory: conversationHistory || [] }),
        });
      } catch {
        const m = buildMock(userMessage);
        return {
          title: m.title, body: m.body, imageKey: m.imageKey,
          chatMessage: "ドラフトを作成しました。本文とサムネイル画像を右側のプレビューでご確認ください。（オフラインデモ）",
          tokensUsed: 0, model: "デモモック（ローカル）", mode: "local-mock",
        };
      }
    },

    // お知らせ内容に合うサムネイル画像をAI生成。
    // 失敗・未対応時は null を返す（呼び出し側は固定ライブラリ画像を使う）
    async generateImage(topic, instruction) {
      try {
        const r = await fetch(`${API}/image`, {
          method: "POST", headers: H,
          body: JSON.stringify({ topic: topic || "", instruction: instruction || "" }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        return d && d.imageDataUrl ? d.imageDataUrl : null;
      } catch {
        return null;
      }
    },
  };

  window.Store = Store;
  window.NEWS_IMAGE_KEYS = IMAGE_KEYS;
  window.NEWS_IMAGE_LABELS = IMAGE_LABELS;
  window.newsImageUrl = imageUrl;
})();
