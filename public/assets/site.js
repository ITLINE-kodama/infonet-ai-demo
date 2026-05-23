/* =============================================================
 *  法人用AIデモ ─ 公開LP（インフォネット風サイト）スクリプト
 * ============================================================= */

function escapeHtmlSite(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatDateSite(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function excerptSite(text, len) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len) + "…" : t;
}

/* ---------- LP：お知らせセクションの描画 ---------- */
async function renderNewsSection() {
  const host = document.getElementById("news-list");
  if (!host) return;
  try {
    const list = await window.Store.listNews("published");
    const items = (Array.isArray(list) ? list : []).slice(0, 5);
    if (items.length === 0) {
      host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">現在お知らせはありません。</p>`;
      return;
    }
    host.innerHTML = items
      .map(
        (n) => `
      <a href="/news.html?id=${encodeURIComponent(n.id)}"
         class="group block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden transition hover:-translate-y-1 hover:shadow-md">
        <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full h-40 object-cover" />
        <div class="p-6">
          <span class="inline-block text-xs font-semibold text-white bg-[#0F3D7E] rounded px-2 py-1">
            ${formatDateSite(n.publishedAt || n.createdAt)}
          </span>
          <h3 class="mt-3 text-base font-semibold text-[#1A1A1A] leading-snug group-hover:text-[#0F3D7E]">
            ${escapeHtmlSite(n.title)}
          </h3>
          <p class="mt-2 text-sm text-[#666] leading-relaxed">${escapeHtmlSite(excerptSite(n.body, 70))}</p>
          <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#00B8D9]">
            詳細を見る <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </span>
        </div>
      </a>`
      )
      .join("");
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">お知らせを読み込めませんでした。</p>`;
  }
}

/* ---------- ヒーロー右側：最新のお知らせカード ---------- */
async function renderHeroLatest() {
  const host = document.getElementById("hero-latest");
  if (!host) return;
  try {
    const list = await window.Store.listNews("published");
    const n = (Array.isArray(list) ? list : [])[0]; // 最新（公開日の新しい順）
    if (!n) { host.style.display = "none"; return; }
    host.href = "/news.html?id=" + encodeURIComponent(n.id);
    host.innerHTML = `
      <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full h-44 object-cover" />
      <div class="p-5">
        <span class="inline-block text-xs font-semibold text-white bg-[#0F3D7E] rounded px-2 py-1">
          ${formatDateSite(n.publishedAt || n.createdAt)}
        </span>
        <h3 class="mt-2.5 text-base font-bold text-[#1A1A1A] leading-snug">${escapeHtmlSite(n.title)}</h3>
        <p class="mt-1.5 text-sm text-[#666] leading-relaxed">${escapeHtmlSite(excerptSite(n.body, 56))}</p>
        <span class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#00B8D9]">
          詳細を見る <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </span>
      </div>`;
    if (window.lucide) lucide.createIcons();
  } catch {
    host.style.display = "none";
  }
}

/* ---------- お知らせ詳細ページの描画 ---------- */
async function renderNewsDetail() {
  const host = document.getElementById("news-detail");
  if (!host) return;
  const params = new URLSearchParams(location.search);
  let id = params.get("id");
  if (!id) {
    const m = location.pathname.match(/\/news\/([^/]+)/);
    if (m) id = m[1];
  }
  if (!id) {
    host.innerHTML = `<p class="text-[#666]">記事が指定されていません。</p>`;
    return;
  }
  try {
    const n = await window.Store.getNews(id);
    if (!n || n.status !== "published") {
      host.innerHTML = `<p class="text-[#666] py-12 text-center">この記事は公開されていないか、削除されました。</p>`;
      return;
    }
    document.title = `${n.title}｜株式会社インフォネット`;
    host.innerHTML = `
      <span class="inline-block text-sm font-semibold text-white bg-[#0F3D7E] rounded px-3 py-1">
        ${formatDateSite(n.publishedAt || n.createdAt)}
      </span>
      <h1 class="mt-5 text-3xl font-bold text-[#1A1A1A] leading-tight">${escapeHtmlSite(n.title)}</h1>
      <div class="mt-4 pb-6 border-b border-[#E5E7EB] text-sm text-[#666]">
        お知らせ ／ 株式会社インフォネット
      </div>
      <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full rounded-xl mt-8 border border-[#E5E7EB]" />
      <div class="article-body mt-8 text-[15px] text-[#1A1A1A]">${escapeHtmlSite(n.body)}</div>
      <div class="mt-10 pt-6 border-t border-[#E5E7EB] flex items-center gap-3">
        <span class="text-sm text-[#666]">この記事を共有：</span>
        <button class="w-9 h-9 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#666] hover:bg-[#F5F7FA]" onclick="alert('※ デモのため共有機能は無効です')"><i data-lucide="share-2" class="w-4 h-4"></i></button>
        <button class="w-9 h-9 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#666] hover:bg-[#F5F7FA]" onclick="alert('※ デモのため共有機能は無効です')"><i data-lucide="mail" class="w-4 h-4"></i></button>
        <button class="w-9 h-9 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#666] hover:bg-[#F5F7FA]" onclick="alert('※ デモのため共有機能は無効です')"><i data-lucide="link" class="w-4 h-4"></i></button>
      </div>`;
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#666] py-12 text-center">記事を読み込めませんでした。</p>`;
  }
}

/* ---------- 採用ページ：募集職種カードのHTML（レイアウト別）---------- */
var POSITIONS_STYLES = ["default", "wide", "horizontal", "row"];
function jobCardHtml(n, style) {
  const url = "/job.html?id=" + encodeURIComponent(n.id);
  const img = window.newsImageUrl(n.image);
  const title = escapeHtmlSite(n.title);
  const badge =
    '<span class="inline-flex items-center gap-1.5 text-[10px] font-en font-black tracking-widest uppercase text-[#0052FF]">' +
    '<span class="w-1.5 h-1.5 rounded-full bg-[#0052FF]"></span>OPEN</span>';
  const more =
    '<span class="mt-5 inline-flex items-center gap-1.5 text-[11px] font-en font-black tracking-widest uppercase text-[#0052FF]">' +
    'DETAILS <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></i></span>';

  if (style === "horizontal") {
    return `
      <a href="${url}"
         class="group flex flex-col sm:flex-row bg-white border border-[#0052FF]/10 rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-[#0052FF]/30 hover:shadow-[0_25px_50px_rgba(0,82,255,0.12)]">
        <div class="sm:w-[42%] shrink-0 overflow-hidden">
          <img src="${img}" alt="" class="w-full h-44 sm:h-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div class="flex-1 p-6 sm:p-7">
          ${badge}
          <h3 class="mt-3 text-[16px] font-black text-[#080C16] leading-snug group-hover:text-[#0052FF] transition-colors">${title}</h3>
          <p class="mt-2 text-sm text-[#080C16]/60 leading-relaxed font-medium">${escapeHtmlSite(excerptSite(n.body, 92))}</p>
          ${more}
        </div>
      </a>`;
  }

  if (style === "wide" || style === "row") {
    return `
      <a href="${url}"
         class="group relative block bg-white border border-[#0052FF]/10 rounded-[20px] overflow-hidden shadow-[0_5px_20px_rgba(0,82,255,0.06)] transition duration-300 hover:-translate-y-2 hover:border-[#0052FF]/30 hover:shadow-[0_30px_60px_rgba(0,82,255,0.15)]">
        <span class="absolute top-0 inset-x-0 h-1 z-10 bg-gradient-to-r from-[#0052FF] via-[#00F0FF] to-[#DFFF00]"></span>
        <div class="overflow-hidden">
          <img src="${img}" alt="" class="w-full ${style === "row" ? "h-44" : "h-52"} object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div class="${style === "row" ? "p-6" : "p-7"}">
          ${badge}
          <h3 class="mt-3 text-[16px] font-black text-[#080C16] leading-snug group-hover:text-[#0052FF] transition-colors">${title}</h3>
          <p class="mt-2 text-[13.5px] text-[#080C16]/60 leading-relaxed font-medium">${escapeHtmlSite(excerptSite(n.body, style === "row" ? 70 : 76))}</p>
          ${more}
        </div>
      </a>`;
  }

  // default
  return `
      <a href="${url}"
         class="group block bg-white border border-[#0052FF]/10 rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:border-[#0052FF]/30 hover:shadow-[0_25px_50px_rgba(0,82,255,0.12)]">
        <div class="overflow-hidden">
          <img src="${img}" alt="" class="w-full h-44 object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div class="p-6">
          ${badge}
          <h3 class="mt-3 text-[15px] font-black text-[#080C16] leading-snug group-hover:text-[#0052FF] transition-colors">${title}</h3>
          <p class="mt-2 text-[13px] text-[#080C16]/60 leading-relaxed font-medium">${escapeHtmlSite(excerptSite(n.body, 68))}</p>
          ${more}
        </div>
      </a>`;
}

/* ---------- 採用ページ：募集職種一覧の描画 ---------- */
async function renderJobsList() {
  const host = document.getElementById("jobs-list");
  if (!host) return;

  // カードのレイアウト（AIおまかせ更新の positionsStyle で指定）
  let style = "default";
  try {
    const r = await window.Store.getRecruit();
    if (r && typeof r.positionsStyle === "string" && POSITIONS_STYLES.indexOf(r.positionsStyle) !== -1) {
      style = r.positionsStyle;
    }
  } catch {}
  const gridClass = {
    default: "mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
    wide: "mt-16 grid sm:grid-cols-2 gap-7",
    horizontal: "mt-16 grid lg:grid-cols-2 gap-6",
    row: "mt-16 grid grid-cols-1 md:grid-cols-3 gap-6",
  }[style];
  host.className = gridClass;

  try {
    const list = await window.Store.listJobs("published");
    const items = Array.isArray(list) ? list : [];
    if (items.length === 0) {
      host.innerHTML = `<p class="text-[#5B6B7F] col-span-full text-center py-8">現在、募集中の職種はありません。</p>`;
      return;
    }
    host.innerHTML = items.map((n) => jobCardHtml(n, style)).join("");
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#5B6B7F] col-span-full text-center py-8">募集職種を読み込めませんでした。</p>`;
  }
}

/* ---------- 求人詳細ページの描画 ---------- */
async function renderJobDetail() {
  const host = document.getElementById("job-detail");
  if (!host) return;
  const params = new URLSearchParams(location.search);
  let id = params.get("id");
  if (!id) {
    const m = location.pathname.match(/\/job\/([^/]+)/);
    if (m) id = m[1];
  }
  if (!id) {
    host.innerHTML = `<p class="text-[#666]">求人が指定されていません。</p>`;
    return;
  }
  try {
    const n = await window.Store.getJob(id);
    if (!n || n.status !== "published") {
      host.innerHTML = `<p class="text-[#666] py-12 text-center">この求人は公開されていないか、募集を終了しました。</p>`;
      return;
    }
    document.title = `${n.title}｜採用情報｜株式会社インフォネット`;
    host.innerHTML = `
      <span class="inline-block text-sm font-semibold text-white bg-[#0F3D7E] rounded px-3 py-1">募集中</span>
      <h1 class="mt-5 text-3xl font-bold text-[#1A1A1A] leading-tight">${escapeHtmlSite(n.title)}</h1>
      <div class="mt-4 pb-6 border-b border-[#E5E7EB] text-sm text-[#666]">
        採用情報 ／ 株式会社インフォネット
      </div>
      <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full rounded-xl mt-8 border border-[#E5E7EB]" />
      <div class="article-body mt-8 text-[15px] text-[#1A1A1A]">${escapeHtmlSite(n.body)}</div>
      <div class="mt-10 pt-6 border-t border-[#E5E7EB] text-center">
        <a href="/#contact" class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0F3D7E] text-white font-semibold hover:opacity-90">
          この職種に応募する <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
        <p class="mt-3 text-[12px] text-[#9CA3AF]">※ デモのため、応募ボタンはお問い合わせフォームへ移動します</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#666] py-12 text-center">求人情報を読み込めませんでした。</p>`;
  }
}

/* ---------- 採用ページ：セクション配色テーマの適用 ---------- */
var SECTION_THEME_NAMES = ["green", "blue", "warm", "gray"];
function applySectionThemes(themes) {
  const t = themes && typeof themes === "object" ? themes : {};
  ["message", "positions", "interview", "benefits", "flow", "blog"].forEach((key) => {
    const sec = document.querySelector('[data-theme-section="' + key + '"]');
    if (!sec) return;
    SECTION_THEME_NAMES.forEach((name) => sec.classList.remove("theme-" + name));
    const theme = t[key];
    if (theme && SECTION_THEME_NAMES.indexOf(theme) !== -1) {
      sec.classList.add("theme-" + theme);
    }
  });
}

/* ---------- 採用ページ：各セクションの描画 ---------- */
async function renderRecruitPage() {
  const mvTitle = document.getElementById("rc-mv-title");
  if (!mvTitle) return; // 採用ページ以外では何もしない
  let r;
  try {
    r = await window.Store.getRecruit();
  } catch {
    return;
  }
  // セクション配色テーマを適用（AIおまかせ更新で指定される）
  applySectionThemes(r.sectionThemes);

  // mvTitle / mvSubtitle は \n を <br> に変換して表示する（AIが改行位置を指定できる）
  const nlToBr = (s) => escapeHtmlSite(s).replace(/\r?\n/g, "<br>");
  mvTitle.innerHTML = nlToBr(r.mvTitle || "採用情報");
  const mvImg = document.getElementById("rc-mv-img");
  if (mvImg && r.mvImage) mvImg.src = window.newsImageUrl(r.mvImage);
  const sub = document.getElementById("rc-mv-subtitle");
  if (sub) sub.innerHTML = nlToBr(r.mvSubtitle || "");
  const msg = document.getElementById("rc-message");
  if (msg) msg.textContent = r.message || ""; // .article-body の pre-wrap で改行が反映される

  // セクション見出し・リード文（AIで編集可）
  const txt = (r.sectionText && typeof r.sectionText === "object") ? r.sectionText : {};
  const SECTION_TEXT_MAP = {
    "rc-vision-heading": "visionHeading",
    "rc-positions-heading": "positionsHeading",
    "rc-positions-lead": "positionsLead",
    "rc-interview-heading": "interviewHeading",
    "rc-stats-heading": "statsHeading",
    "rc-benefits-heading": "benefitsHeading",
    "rc-flow-heading": "flowHeading",
    "rc-blog-heading": "blogHeading",
    "rc-cta-heading": "ctaHeading",
    "rc-cta-subtext": "ctaSubtext",
  };
  Object.entries(SECTION_TEXT_MAP).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && typeof txt[key] === "string" && txt[key].trim()) {
      el.innerHTML = nlToBr(txt[key]);
    }
  });

  // 選考フロー4ステップ（AIで編集可）
  const flowHost = document.getElementById("rc-flow-steps");
  if (flowHost) {
    const steps = Array.isArray(r.flowSteps) && r.flowSteps.length
      ? r.flowSteps
      : [
          { phase: "PHASE 01", title: "エントリー", desc: "数分で完了するスマートフォームよりご応募ください。" },
          { phase: "PHASE 02", title: "オンライン選考", desc: "これまでの成果や、あなたが挑戦したいビジョンを拝見します。" },
          { phase: "PHASE 03", title: "インタビュー", desc: "オンライン対応。スキルだけでなく、カルチャーフィットを対話します。" },
          { phase: "PHASE 04", title: "オファー & ジョイン", desc: "条件確定後、インフォネットの未来のコアとしてお迎えします！" },
        ];
    flowHost.innerHTML = steps.map((s, i) => {
      const isLast = i === steps.length - 1;
      return isLast
        ? `<div class="relative bg-gradient-to-br from-techblue to-blue-700 text-white rounded-2xl p-8 shadow-[0_15px_35px_rgba(0,82,255,0.3)] hover:scale-[1.02] transition-transform">
            <span class="font-en font-black text-5xl text-white/10 absolute top-4 right-6 select-none">${String(i + 1).padStart(2, "0")}</span>
            <div>
              <p class="font-en font-black text-[11px] text-neonyellow tracking-widest">${escapeHtmlSite(s.phase || "")}</p>
              <h3 class="mt-3 font-black text-lg text-white">${escapeHtmlSite(s.title || "")}</h3>
              <p class="mt-3 text-sm text-white/80 leading-relaxed font-medium">${escapeHtmlSite(s.desc || "")}</p>
            </div>
          </div>`
        : `<div class="relative bg-[#F8FAFC] border border-techblue/10 rounded-2xl p-8 group hover:bg-white hover:border-techblue/30 hover:shadow-[0_20px_40px_rgba(0,82,255,0.08)] transition-all duration-300">
            <span class="font-en font-black text-5xl text-techblue/5 group-hover:text-techblue/10 absolute top-4 right-6 select-none transition-colors">${String(i + 1).padStart(2, "0")}</span>
            <div>
              <p class="font-en font-black text-[11px] text-techblue tracking-widest">${escapeHtmlSite(s.phase || "")}</p>
              <h3 class="mt-3 font-black text-lg text-futuredark">${escapeHtmlSite(s.title || "")}</h3>
              <p class="mt-3 text-sm text-futuredark/60 leading-relaxed font-medium">${escapeHtmlSite(s.desc || "")}</p>
            </div>
          </div>`;
    }).join("");
  }

  // フォントサイズ等のスタイル上書き
  const STYLE_TARGET_MAP = {
    mvTitle: "rc-mv-title",
    mvSubtitle: "rc-mv-subtitle",
    message: "rc-message",
    visionHeading: "rc-vision-heading",
    positionsHeading: "rc-positions-heading",
    positionsLead: "rc-positions-lead",
    interviewHeading: "rc-interview-heading",
    statsHeading: "rc-stats-heading",
    benefitsHeading: "rc-benefits-heading",
    flowHeading: "rc-flow-heading",
    blogHeading: "rc-blog-heading",
    ctaHeading: "rc-cta-heading",
    ctaSubtext: "rc-cta-subtext",
  };
  const ALLOWED_STYLE_PROPS = ["fontSize", "fontWeight", "textAlign", "color", "letterSpacing", "lineHeight"];
  const overrides = (r.styleOverrides && typeof r.styleOverrides === "object") ? r.styleOverrides : {};
  Object.entries(overrides).forEach(([key, style]) => {
    const id = STYLE_TARGET_MAP[key];
    if (!id || !style || typeof style !== "object") return;
    const el = document.getElementById(id);
    if (!el) return;
    ALLOWED_STYLE_PROPS.forEach((prop) => {
      if (typeof style[prop] === "string" && style[prop].trim()) {
        el.style[prop] = style[prop];
      }
    });
  });

  const ivHost = document.getElementById("rc-interviews");
  if (ivHost) {
    const ivs = Array.isArray(r.interviews) ? r.interviews : [];
    ivHost.innerHTML =
      ivs.length === 0
        ? `<p class="text-[#666] col-span-full text-center py-4">インタビューは準備中です。</p>`
        : ivs
            .map(
              (iv) => `
      <div class="group bg-white border border-[#0052FF]/10 rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:border-[#0052FF]/30 hover:shadow-[0_25px_50px_rgba(0,82,255,0.12)]">
        <div class="overflow-hidden">
          <img src="${window.newsImageUrl(iv.image)}" alt="" class="w-full h-60 object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div class="p-7">
          <i data-lucide="quote" class="w-7 h-7 text-[#0052FF]/40"></i>
          <p class="mt-3 text-[13.5px] text-[#080C16]/80 leading-[2] font-medium article-body">${escapeHtmlSite(iv.comment)}</p>
          <div class="mt-6 pt-5 border-t border-[#0052FF]/10">
            <p class="font-black text-[#080C16]">${escapeHtmlSite(iv.name)}</p>
            <p class="font-en text-[12px] text-[#0052FF] mt-1 tracking-wider">${escapeHtmlSite(iv.role)}</p>
          </div>
        </div>
      </div>`
            )
            .join("");
  }

  const stHost = document.getElementById("rc-stats");
  if (stHost) {
    const sts = Array.isArray(r.stats) ? r.stats : [];
    stHost.innerHTML = sts
      .map(
        (s) => `
      <div>
        <p class="text-[11px] text-[#DFFF00] tracking-[0.25em] uppercase font-black">${escapeHtmlSite(s.label)}</p>
        <p class="mt-4 text-5xl md:text-[3.6rem] text-white tracking-tight leading-none">${escapeHtmlSite(s.value)}</p>
        <div class="mt-5 w-8 h-px bg-white/20 mx-auto"></div>
      </div>`
      )
      .join("");
  }

  const bnHost = document.getElementById("rc-benefits");
  if (bnHost) {
    const bns = Array.isArray(r.benefits) ? r.benefits : [];
    bnHost.innerHTML = bns
      .map(
        (b) => `
      <div class="bg-white rounded-2xl p-7 border border-[#0052FF]/10 transition duration-300 hover:-translate-y-1 hover:border-[#0052FF]/30 hover:shadow-[0_20px_40px_rgba(0,82,255,0.1)]">
        <div class="w-12 h-12 rounded-xl bg-[#0052FF]/10 flex items-center justify-center text-[#0052FF]">
          <i data-lucide="check" class="w-5 h-5"></i>
        </div>
        <h3 class="mt-5 font-black text-[15px] text-[#080C16]">${escapeHtmlSite(b.title)}</h3>
        <p class="mt-2 text-[13px] text-[#080C16]/60 leading-relaxed font-medium">${escapeHtmlSite(b.desc)}</p>
      </div>`
      )
      .join("");
  }
  if (window.lucide) lucide.createIcons();
}

/* ---------- ブログのカテゴリーラベル ---------- */
function blogCategoryLabel(cat) {
  const m = window.BLOG_CATEGORY_LABELS || {};
  return m[cat] || cat || "";
}

/* ---------- 採用ページ：ブログ一覧の描画 ---------- */
async function renderBlogList() {
  const host = document.getElementById("rc-blog-list");
  if (!host) return;
  try {
    const list = await window.Store.listBlog("published");
    const items = (Array.isArray(list) ? list : []).slice(0, 6);
    if (items.length === 0) {
      host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">ブログ記事は準備中です。</p>`;
      return;
    }
    host.innerHTML = items
      .map(
        (n) => `
      <a href="/blog.html?id=${encodeURIComponent(n.id)}"
         class="group block bg-white border border-[#0052FF]/10 rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:border-[#0052FF]/30 hover:shadow-[0_25px_50px_rgba(0,82,255,0.12)]">
        <div class="relative overflow-hidden">
          <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full h-48 object-cover transition duration-500 group-hover:scale-105" />
          <span class="absolute top-3.5 left-3.5 text-[10px] font-en font-black tracking-widest uppercase text-[#080C16] bg-[#DFFF00] rounded-full px-2.5 py-1">
            ${escapeHtmlSite(blogCategoryLabel(n.category))}
          </span>
        </div>
        <div class="p-6">
          <span class="text-[11px] font-en font-black text-[#0052FF] tracking-widest uppercase">${formatDateSite(n.publishedAt || n.createdAt)}</span>
          <h3 class="mt-2 text-[15.5px] font-black text-[#080C16] leading-snug group-hover:text-[#0052FF] transition-colors">
            ${escapeHtmlSite(n.title)}
          </h3>
          <p class="mt-2 text-[13px] text-[#080C16]/60 leading-relaxed font-medium">${escapeHtmlSite(excerptSite(n.body, 66))}</p>
          ${
            Array.isArray(n.tags) && n.tags.length
              ? `<div class="mt-4 flex flex-wrap gap-1.5">${n.tags
                  .map((t) => `<span class="text-[11px] text-[#080C16]/60 bg-[#F8FAFC] border border-[#0052FF]/10 rounded-full px-2.5 py-0.5 font-medium">#${escapeHtmlSite(t)}</span>`)
                  .join("")}</div>`
              : ""
          }
        </div>
      </a>`
      )
      .join("");
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">ブログを読み込めませんでした。</p>`;
  }
}

/* ---------- ブログ詳細ページの描画 ---------- */
async function renderBlogDetail() {
  const host = document.getElementById("blog-detail");
  if (!host) return;
  const params = new URLSearchParams(location.search);
  let id = params.get("id");
  if (!id) {
    const m = location.pathname.match(/\/blog\/([^/]+)/);
    if (m) id = m[1];
  }
  if (!id) {
    host.innerHTML = `<p class="text-[#666]">記事が指定されていません。</p>`;
    return;
  }
  try {
    const n = await window.Store.getBlog(id);
    if (!n || n.status !== "published") {
      host.innerHTML = `<p class="text-[#666] py-12 text-center">この記事は公開されていないか、削除されました。</p>`;
      return;
    }
    document.title = `${n.title}｜ブログ｜株式会社インフォネット`;
    host.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="inline-block text-sm font-semibold text-white bg-[#00B8D9] rounded px-3 py-1">
          ${escapeHtmlSite(blogCategoryLabel(n.category))}
        </span>
        <span class="text-sm text-[#9CA3AF]">${formatDateSite(n.publishedAt || n.createdAt)}</span>
      </div>
      <h1 class="mt-5 text-3xl font-bold text-[#1A1A1A] leading-tight">${escapeHtmlSite(n.title)}</h1>
      <div class="mt-4 pb-6 border-b border-[#E5E7EB] text-sm text-[#666]">
        ブログ ／ 株式会社インフォネット
      </div>
      <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full rounded-xl mt-8 border border-[#E5E7EB]" />
      <div class="article-body mt-8 text-[15px] text-[#1A1A1A]">${escapeHtmlSite(n.body)}</div>
      ${
        Array.isArray(n.tags) && n.tags.length
          ? `<div class="mt-8 flex flex-wrap gap-2">${n.tags
              .map((t) => `<span class="text-[13px] text-[#0F3D7E] bg-[#F5F7FA] border border-[#E5E7EB] rounded-full px-3 py-1">#${escapeHtmlSite(t)}</span>`)
              .join("")}</div>`
          : ""
      }
      <div class="mt-10 pt-6 border-t border-[#E5E7EB] flex items-center justify-between gap-3 flex-wrap">
        <a href="/recruit.html#blog" class="inline-flex items-center gap-1 text-sm font-medium text-[#0F3D7E] hover:underline">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> ブログ一覧へ戻る
        </a>
        <div class="flex items-center gap-3">
          <span class="text-sm text-[#666]">この記事を共有：</span>
          <button class="w-9 h-9 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#666] hover:bg-[#F5F7FA]" onclick="alert('※ デモのため共有機能は無効です')"><i data-lucide="share-2" class="w-4 h-4"></i></button>
          <button class="w-9 h-9 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#666] hover:bg-[#F5F7FA]" onclick="alert('※ デモのため共有機能は無効です')"><i data-lucide="link" class="w-4 h-4"></i></button>
        </div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  } catch {
    host.innerHTML = `<p class="text-[#666] py-12 text-center">記事を読み込めませんでした。</p>`;
  }
}

/* ---------- モバイルメニュー ---------- */
function initMobileMenu() {
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  }
}

/* ---------- スクロール時のセクション表示アニメーション ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeroLatest();
  renderNewsSection();
  renderNewsDetail();
  renderJobsList();
  renderJobDetail();
  renderRecruitPage();
  renderBlogList();
  renderBlogDetail();
  initMobileMenu();
  initReveal();
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
