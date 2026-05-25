// =============================================================
//  /assets/image-lib.js
//  全admin画面で共有する「画像ライブラリ」（過去にAI生成・アップロードした画像）
//  ・localStorage `infonet_demo_media` に最新12件を保存
//  ・モーダルHTMLを自動注入
//  ・window.ImageLib.openPicker(onPick) で選択UI起動
//  ・window.ImageLib.save(dataUrl, label) で保存（AI生成・アップロード時）
// =============================================================
(function () {
  if (window.ImageLib) return; // 二重定義防止

  const LIB_KEY = "infonet_demo_media";
  const LIB_MAX = 12;
  const MODAL_ID = "ilib-modal";

  function load() {
    try { return JSON.parse(localStorage.getItem(LIB_KEY) || "[]"); } catch { return []; }
  }
  function save(dataUrl, label) {
    if (!dataUrl || typeof dataUrl !== "string") return;
    try {
      const list = load();
      if (list.some((it) => it.dataUrl === dataUrl)) return;
      list.unshift({
        id: "m-" + Date.now().toString(36),
        dataUrl,
        label: label || "画像",
        createdAt: new Date().toISOString(),
      });
      while (list.length > LIB_MAX) list.pop();
      localStorage.setItem(LIB_KEY, JSON.stringify(list));
    } catch {}
  }
  function clear() {
    try { localStorage.removeItem(LIB_KEY); } catch {}
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    const html = `
<div id="${MODAL_ID}" class="hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
    <div class="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold flex items-center gap-2">
          <i data-lucide="images" class="w-5 h-5 text-[#1E2761]"></i> 画像ライブラリ
        </h3>
        <p id="ilib-subtitle" class="text-[12px] text-[#6B7280] mt-0.5">これまでにアップロード／生成した画像です。クリックで適用できます。</p>
      </div>
      <button id="ilib-close" type="button" class="w-9 h-9 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280]">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>
    <div id="ilib-grid" class="flex-1 overflow-y-auto thin-scroll p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"></div>
    <div class="px-6 py-3 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
      <p class="text-[12px] text-[#6B7280]">最新の${LIB_MAX}件まで保存されます（端末内）</p>
      <button id="ilib-clear" type="button" class="text-[12px] font-medium text-[#EF4444] hover:underline">すべて削除</button>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("ilib-close").addEventListener("click", close);
    document.getElementById(MODAL_ID).addEventListener("click", (e) => {
      if (e.target.id === MODAL_ID) close();
    });
    document.getElementById("ilib-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const item = load().find((x) => x.id === btn.dataset.id);
      if (item && currentPick) {
        const cb = currentPick;
        currentPick = null;
        close();
        cb(item.dataUrl, item);
      }
    });
    document.getElementById("ilib-clear").addEventListener("click", async () => {
      // confirmModal があれば使う、無ければ window.confirm にフォールバック
      let ok;
      if (typeof window.confirmModal === "function") {
        ok = await window.confirmModal({
          title: "画像ライブラリをすべて削除しますか？",
          message: "保存されている画像をすべて削除します。この操作は取り消せません。",
          okText: "すべて削除",
          danger: true,
        });
      } else {
        ok = window.confirm("画像ライブラリをすべて削除しますか？");
      }
      if (!ok) return;
      clear();
      renderGrid();
      if (typeof window.toast === "function") window.toast("画像ライブラリをクリアしました", "info");
    });
  }

  function renderGrid() {
    const host = document.getElementById("ilib-grid");
    if (!host) return;
    const list = load();
    if (!list.length) {
      host.innerHTML = `<div class="col-span-full text-center py-16 text-[13px] text-[#9CA3AF]">
        まだ画像がありません。<br>
        AIで生成した画像やアップロードした画像が、ここに自動で保存されます。
      </div>`;
      return;
    }
    host.innerHTML = list.map((it) => `
      <button type="button" data-id="${it.id}"
        class="group relative aspect-square rounded-xl overflow-hidden border border-[#E5E7EB] hover:border-[#1E2761] hover:shadow-lg transition-all bg-[#F3F4F6]">
        <img src="${it.dataUrl}" alt="" class="absolute inset-0 w-full h-full object-cover" />
        <span class="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent text-[10px] text-white text-left">
          ${escapeHtml(it.label || "")}
        </span>
      </button>
    `).join("");
  }

  let currentPick = null;

  function open(subtitle) {
    ensureModal();
    const sub = document.getElementById("ilib-subtitle");
    if (sub && subtitle) sub.textContent = subtitle;
    renderGrid();
    const m = document.getElementById(MODAL_ID);
    m.classList.remove("hidden");
    m.classList.add("flex");
    if (window.lucide) window.lucide.createIcons();
  }
  function close() {
    const m = document.getElementById(MODAL_ID);
    if (!m) return;
    m.classList.add("hidden");
    m.classList.remove("flex");
    currentPick = null;
  }
  // 選択モードで開く。onPick(dataUrl, item) が呼ばれる
  function openPicker(onPick, options) {
    currentPick = typeof onPick === "function" ? onPick : null;
    open(options && options.subtitle);
  }

  window.ImageLib = {
    load, save, clear,
    open: () => open(),
    openPicker, close,
  };
})();
