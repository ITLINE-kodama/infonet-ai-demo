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

/* ---------- 採用ページ：募集職種一覧の描画 ---------- */
async function renderJobsList() {
  const host = document.getElementById("jobs-list");
  if (!host) return;
  try {
    const list = await window.Store.listJobs("published");
    const items = Array.isArray(list) ? list : [];
    if (items.length === 0) {
      host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">現在、募集中の職種はありません。</p>`;
      return;
    }
    host.innerHTML = items
      .map(
        (n) => `
      <a href="/job.html?id=${encodeURIComponent(n.id)}"
         class="group block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden transition hover:-translate-y-1 hover:shadow-md">
        <img src="${window.newsImageUrl(n.image)}" alt="" class="w-full h-40 object-cover" />
        <div class="p-6">
          <span class="inline-block text-xs font-semibold text-white bg-[#0F3D7E] rounded px-2 py-1">募集中</span>
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
    host.innerHTML = `<p class="text-[#666] col-span-full text-center py-8">募集職種を読み込めませんでした。</p>`;
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
  mvTitle.textContent = r.mvTitle || "採用情報";
  const sub = document.getElementById("rc-mv-subtitle");
  if (sub) sub.textContent = r.mvSubtitle || "";
  const msg = document.getElementById("rc-message");
  if (msg) msg.textContent = r.message || "";

  const ivHost = document.getElementById("rc-interviews");
  if (ivHost) {
    const ivs = Array.isArray(r.interviews) ? r.interviews : [];
    ivHost.innerHTML =
      ivs.length === 0
        ? `<p class="text-[#666] col-span-full text-center py-4">インタビューは準備中です。</p>`
        : ivs
            .map(
              (iv) => `
      <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <img src="${window.newsImageUrl(iv.image)}" alt="" class="w-full h-48 object-cover" />
        <div class="p-5">
          <h3 class="font-bold text-[#1A1A1A]">${escapeHtmlSite(iv.name)}</h3>
          <p class="text-sm text-[#00B8D9] font-medium mt-0.5">${escapeHtmlSite(iv.role)}</p>
          <p class="mt-3 text-sm text-[#666] leading-relaxed article-body">${escapeHtmlSite(iv.comment)}</p>
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
      <div class="text-center">
        <p class="text-3xl md:text-4xl font-bold">${escapeHtmlSite(s.value)}</p>
        <p class="mt-1.5 text-sm text-white/70">${escapeHtmlSite(s.label)}</p>
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
      <div class="bg-white rounded-xl p-6 border border-[#E5E7EB]">
        <div class="w-10 h-10 rounded-lg bg-[#00B8D9]/10 flex items-center justify-center text-[#00B8D9]">
          <i data-lucide="check" class="w-5 h-5"></i>
        </div>
        <h3 class="mt-3 font-semibold">${escapeHtmlSite(b.title)}</h3>
        <p class="mt-1 text-sm text-[#666] leading-relaxed">${escapeHtmlSite(b.desc)}</p>
      </div>`
      )
      .join("");
  }
  if (window.lucide) lucide.createIcons();
}

/* ---------- モバイルメニュー ---------- */
function initMobileMenu() {
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeroLatest();
  renderNewsSection();
  renderNewsDetail();
  renderJobsList();
  renderJobDetail();
  renderRecruitPage();
  initMobileMenu();
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
