/* =============================================================
 *  法人用AIデモ ─ 管理画面 共通スクリプト
 * ============================================================= */

/* -------------------------------------------------------------
 *  ★ ロゴ・ブランド設定（ご依頼②）
 *  クライアントに合わせて見せる場合、ここだけ書き換えれば
 *  管理画面全体のロゴ・社名が切り替わります。
 *  画像ロゴを使う場合は logoImage にパスを指定してください。
 *    例: logoImage: "/assets/client-logo.png"
 * ------------------------------------------------------------- */
const BRAND = {
  name: "INFONET",                 // ロゴに表示する英字
  fullName: "株式会社インフォネット",  // 正式社名
  logoImage: "/assets/infonet-logo.png", // 画像ロゴのパス（null ならテキストロゴ）
  logoOnDark: true,                // 暗い背景用にロゴを白へ反転（明るいロゴならfalse）
  productName: "AIでらくらく更新",    // サービス名（管理画面の副題）
};

/* ---------- 認証（デモ用の簡易セッション） ---------- */
function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("infonet_admin") || "null");
  } catch {
    return null;
  }
}
function setUser(user) {
  sessionStorage.setItem("infonet_admin", JSON.stringify(user));
}
function logout() {
  sessionStorage.removeItem("infonet_admin");
  location.href = "/admin/";
}

/* ---------- API ヘルパー（store.js の Store に委譲）----------
 * Store は Netlify Functions を優先し、サーバーが使えない場合は
 * localStorage に自動フォールバックします（store.js 参照）。
 */
function apiGenerate(userMessage, conversationHistory, mode) {
  return window.Store.generate(userMessage, conversationHistory, mode);
}
function apiListNews(status) { return window.Store.listNews(status); }
function apiGetNews(id) { return window.Store.getNews(id); }
function apiCreateNews(data) { return window.Store.createNews(data); }
function apiUpdateNews(id, data) { return window.Store.updateNews(id, data); }
function apiDeleteNews(id) { return window.Store.deleteNews(id); }
function apiListJobs(status) { return window.Store.listJobs(status); }
function apiGetJob(id) { return window.Store.getJob(id); }
function apiCreateJob(data) { return window.Store.createJob(data); }
function apiUpdateJob(id, data) { return window.Store.updateJob(id, data); }
function apiDeleteJob(id) { return window.Store.deleteJob(id); }
function apiGetRecruit() { return window.Store.getRecruit(); }
function apiSaveRecruit(patch) { return window.Store.saveRecruit(patch); }
function apiRecruitAI(instruction, current) { return window.Store.recruitAI(instruction, current); }
function apiResetRecruit() { return window.Store.resetRecruit(); }
function apiListBlog(status) { return window.Store.listBlog(status); }
function apiGetBlog(id) { return window.Store.getBlog(id); }
function apiCreateBlog(data) { return window.Store.createBlog(data); }
function apiUpdateBlog(id, data) { return window.Store.updateBlog(id, data); }
function apiDeleteBlog(id) { return window.Store.deleteBlog(id); }
function apiListLogs() { return window.Store.listLogs(); }
async function apiLog(data) {
  try { await window.Store.addLog(data); } catch { /* ログ失敗はデモ進行を止めない */ }
}
function apiResetDemo() { return window.Store.resetDemo(); }

/* ---------- 表示ユーティリティ ---------- */
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function excerpt(text, len) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len) + "…" : t;
}

/* ---------- トースト ---------- */
function toast(message, type) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "fixed bottom-6 right-6 z-50 flex flex-col gap-2";
    document.body.appendChild(host);
  }
  const colors = {
    success: "bg-[#10B981]",
    error: "bg-[#EF4444]",
    info: "bg-[#1E2761]",
  };
  const el = document.createElement("div");
  el.className = `toast text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg ${colors[type] || colors.info}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

/* ---------- 確認モーダル ---------- */
function confirmModal({ title, message, okText = "実行する", cancelText = "キャンセル", danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 fade-in";
    overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-[#111827]">${escapeHtml(title)}</h3>
        <p class="mt-2 text-sm text-[#6B7280] leading-relaxed">${escapeHtml(message)}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button data-act="cancel" class="px-4 py-2 text-sm font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]">${escapeHtml(cancelText)}</button>
          <button data-act="ok" class="px-4 py-2 text-sm font-semibold rounded-lg text-white ${danger ? "bg-[#EF4444]" : "bg-[#1E2761]"} hover:opacity-90">${escapeHtml(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = (val) => { overlay.remove(); resolve(val); };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "ok") close(true);
      if (act === "cancel") close(false);
    });
  });
}

/* ---------- サイドバー & 画面初期化 ---------- */
const NAV_ITEMS = [
  { key: "dashboard", label: "ダッシュボード", href: "/admin/dashboard.html", icon: "layout-dashboard" },
  { group: "お知らせ" },
  { key: "news", label: "ニュース更新", href: "/admin/news.html", icon: "sparkles" },
  { key: "drafts", label: "下書き一覧", href: "/admin/drafts.html", icon: "file-text" },
  { key: "published", label: "公開済み", href: "/admin/published.html", icon: "globe" },
  { group: "採用サイト" },
  { key: "recruit-edit", label: "採用ページ編集", href: "/admin/recruit-edit.html", icon: "file-pen" },
  { key: "jobs", label: "求人作成", href: "/admin/jobs.html", icon: "briefcase" },
  { key: "jobs-list", label: "求人一覧", href: "/admin/jobs-list.html", icon: "users" },
  { key: "blog", label: "ブログ作成", href: "/admin/blog.html", icon: "pen-line", badge: "NEW" },
  { key: "blog-list", label: "ブログ一覧", href: "/admin/blog-list.html", icon: "newspaper" },
  { group: "その他" },
  { key: "logs", label: "ログ・履歴", href: "/admin/logs.html", icon: "scroll-text" },
];

function logoMarkup() {
  if (BRAND.logoImage) {
    const inv = BRAND.logoOnDark ? " brightness-0 invert" : "";
    return `<img src="${escapeHtml(BRAND.logoImage)}" alt="${escapeHtml(BRAND.name)}" class="h-7 w-auto${inv}" />`;
  }
  return `<span class="text-white font-bold text-lg tracking-wide">${escapeHtml(BRAND.name)}</span>`;
}

function initAdmin(activeKey) {
  const user = getUser();
  if (!user) {
    location.href = "/admin/";
    return null;
  }

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.className =
      "w-[240px] shrink-0 bg-[#1E2761] text-white flex flex-col min-h-screen sticky top-0 h-screen";
    sidebar.innerHTML = `
      <div class="px-5 py-5 border-b border-white/10">
        <a href="/" class="flex items-center gap-2">${logoMarkup()}</a>
        <p class="mt-1 text-[11px] text-white/55">${escapeHtml(BRAND.productName)}</p>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        ${NAV_ITEMS.map((it) => {
          if (it.group) {
            return `<p class="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-wider text-white/35 uppercase">${escapeHtml(it.group)}</p>`;
          }
          const active = it.key === activeKey;
          return `
          <a href="${it.href}" class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
            ${active ? "bg-white/10 font-semibold" : "text-white/75 hover:bg-white/5 hover:text-white"}">
            ${active ? '<span class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#00B8D9]"></span>' : ""}
            <i data-lucide="${it.icon}" class="w-[18px] h-[18px]"></i>
            <span>${it.label}</span>
            ${it.badge ? `<span class="ml-auto text-[10px] font-bold bg-[#00B8D9] text-white px-1.5 py-0.5 rounded">${it.badge}</span>` : ""}
          </a>`;
        }).join("")}
      </nav>
      <div class="px-3 py-4 border-t border-white/10">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="w-9 h-9 rounded-full bg-[#00B8D9] flex items-center justify-center text-sm font-semibold">
            ${escapeHtml((user.name || "担").slice(0, 1))}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(user.name)}</p>
            <p class="text-[11px] text-white/55 truncate">${escapeHtml(user.email || "")}</p>
          </div>
        </div>
        <button id="logout-btn" class="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/5">
          <i data-lucide="log-out" class="w-[18px] h-[18px]"></i><span>ログアウト</span>
        </button>
      </div>`;

    sidebar.querySelector("#logout-btn").addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "ログアウトしますか？",
        message: "管理画面からログアウトします。",
        okText: "ログアウト",
      });
      if (ok) logout();
    });
  }

  if (window.lucide) lucide.createIcons();
  return user;
}
