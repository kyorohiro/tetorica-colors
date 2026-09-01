const PWA_URL = "https://kyorohiro.github.io/tetorica-colors/demo/";
const PWA_HOST = "kyorohiro.github.io"
const PWA_PATH = "/tetorica-colors/"

function isPwaDistributionLocation() {
  const host = window.location.hostname;
  const path = window.location.pathname;

  //if (host === "localhost" || host === "127.0.0.1"  || host === "0.0.0.0") {
  //  return true;
  //}

  return (
    host === PWA_HOST &&
    path.startsWith(PWA_PATH)
  );
}

function shouldShowPwaLink() {
  return !isPwaDistributionLocation();
}

function isOfficialPwaHost() {
  const host = window.location.hostname;
  return (
    host === "kyorohiro.github.io" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

function showPwaLink(url: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.right = "16px";
  container.style.bottom = "16px";
  container.style.zIndex = "9999";
  container.style.padding = "12px 16px";
  container.style.borderRadius = "12px";
  container.style.background = "rgba(15, 23, 42, 0.92)";
  container.style.color = "white";
  container.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
  container.style.maxWidth = "320px";
  container.style.fontSize = "14px";
  container.innerHTML = `
    <div style="margin-bottom:8px; font-weight:600;">
      Installable PWA version
    </div>
    <div style="margin-bottom:12px; line-height:1.5;">
      For install/offline use, open the PWA version on GitHub Pages.
    </div>
    <a
      href="${url}"
      target="_blank"
      rel="noopener noreferrer"
      style="
        display:inline-block;
        padding:8px 12px;
        border-radius:8px;
        background:#22c55e;
        color:#052e16;
        text-decoration:none;
        font-weight:700;
      "
    >
      Open PWA Version
    </a>
  `;
  document.body.appendChild(container);
}

//if (!isOfficialPwaHost()) {
//  showPwaLink(PWA_URL);
//}

//
//
//
async function updatePwaNow() {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    window.location.reload();
    return;
  }

  let reloading = false;
  const reloadOnce = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, {
    once: true,
  });

  // 手動で更新チェック
  await reg.update();

  // すでに waiting がいれば即切り替え
  if (reg.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  // 今 install 中なら、installed 後に切り替え
  if (reg.installing) {
    reg.installing.addEventListener("statechange", () => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
    return;
  }

  // 何も起きなければ通常リロード
  window.location.reload();
}

async function hardResetPwa() {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  window.location.href = "/tetorica-colors/demo/";
}

function isRunningAsPwa(): boolean {
  const iosStandalone =
    "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const displayModeStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches;

  return iosStandalone || displayModeStandalone;
}

export {
  isOfficialPwaHost,
  isPwaDistributionLocation,
  shouldShowPwaLink,
  showPwaLink,
  PWA_URL,
  PWA_HOST,
  PWA_PATH,
  updatePwaNow,
  hardResetPwa,
  isRunningAsPwa,
}

