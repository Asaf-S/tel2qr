import QRCode from "qrcode";

const MODAL_ID = "tel2qr-modal";
const STYLES_ID = "tel2qr-styles";

let method = "overlay";
chrome.storage.sync.get({ method: "overlay" }, (r) => { method = r.method as string; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.method) method = changes.method.newValue as string;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function toWhatsAppUrl(telHref: string): string {
  const digits = telHref.replace(/^tel:/i, "").replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

// ── Overlay modal ─────────────────────────────────────────────────────────────

function removeModal(): void {
  document.getElementById(MODAL_ID)?.remove();
}

function injectStyles(): void {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    #tel2qr-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.55);
      font-family: system-ui, sans-serif;
    }
    #tel2qr-modal .tel2qr-card {
      background: #fff;
      border-radius: 16px;
      padding: 28px 32px 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.28);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      min-width: 240px;
      max-width: 320px;
    }
    #tel2qr-modal .tel2qr-title {
      font-size: 13px;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0;
    }
    #tel2qr-modal .tel2qr-number {
      font-size: 20px;
      font-weight: 700;
      color: #111;
      margin: 0;
      word-break: break-all;
      text-align: center;
    }
    #tel2qr-modal canvas {
      border-radius: 8px;
    }
    #tel2qr-modal .tel2qr-hint {
      font-size: 12px;
      color: #888;
      margin: 0;
      text-align: center;
    }
    #tel2qr-modal .tel2qr-actions {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    #tel2qr-modal .tel2qr-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    #tel2qr-modal .tel2qr-btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    #tel2qr-modal .tel2qr-btn-secondary:hover { background: #e0e0e0; }
    #tel2qr-modal .tel2qr-btn-primary {
      background: #1a73e8;
      color: #fff;
    }
    #tel2qr-modal .tel2qr-btn-primary:hover { background: #1557b0; }
    #tel2qr-modal .tel2qr-tabs {
      display: flex;
      width: 100%;
      gap: 4px;
      background: #f0f0f0;
      border-radius: 8px;
      padding: 3px;
    }
    #tel2qr-modal .tel2qr-tab {
      flex: 1;
      padding: 5px 8px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      color: #666;
      transition: all 0.15s;
    }
    #tel2qr-modal .tel2qr-tab.active {
      background: #fff;
      color: #111;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    #tel2qr-modal .tel2qr-tab:hover:not(.active) { background: rgba(0,0,0,0.05); }
    #tel2qr-modal .tel2qr-pane {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 100%;
    }
    #tel2qr-modal .tel2qr-pane.hidden { display: none; }
  `;
  document.head.appendChild(style);
}

async function showModal(telHref: string): Promise<void> {
  removeModal();
  injectStyles();
  const waUrl = toWhatsAppUrl(telHref);

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `QR code for ${telHref}`);

  const card = document.createElement("div");
  card.className = "tel2qr-card";

  const number = document.createElement("p");
  number.className = "tel2qr-number";
  number.textContent = decodeURIComponent(telHref.replace(/^tel:/i, ""));

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "tel2qr-tabs";
  const callTab = document.createElement("button");
  callTab.className = "tel2qr-tab active";
  callTab.textContent = "Call";
  const waTab = document.createElement("button");
  waTab.className = "tel2qr-tab";
  waTab.textContent = "WhatsApp";
  tabs.append(callTab, waTab);

  // Call pane
  const callPane = document.createElement("div");
  callPane.className = "tel2qr-pane";
  const callCanvas = document.createElement("canvas");
  const callHint = document.createElement("p");
  callHint.className = "tel2qr-hint";
  callHint.textContent = "Point your phone camera at this QR code";
  const callActions = document.createElement("div");
  callActions.className = "tel2qr-actions";
  const openBtn = document.createElement("button");
  openBtn.className = "tel2qr-btn tel2qr-btn-secondary";
  openBtn.textContent = "Open in app";
  openBtn.addEventListener("click", () => { removeModal(); window.location.href = telHref; });
  const closeBtn1 = document.createElement("button");
  closeBtn1.className = "tel2qr-btn tel2qr-btn-primary";
  closeBtn1.textContent = "Close";
  closeBtn1.addEventListener("click", removeModal);
  callActions.append(openBtn, closeBtn1);
  callPane.append(callCanvas, callHint, callActions);

  // WhatsApp pane
  const waPane = document.createElement("div");
  waPane.className = "tel2qr-pane hidden";
  const waCanvas = document.createElement("canvas");
  const waHint = document.createElement("p");
  waHint.className = "tel2qr-hint";
  waHint.textContent = "Scan to open WhatsApp and call";
  const waActions = document.createElement("div");
  waActions.className = "tel2qr-actions";
  const waOpenBtn = document.createElement("button");
  waOpenBtn.className = "tel2qr-btn tel2qr-btn-secondary";
  waOpenBtn.textContent = "Open WhatsApp";
  waOpenBtn.addEventListener("click", () => { removeModal(); window.open(waUrl, "_blank"); });
  const closeBtn2 = document.createElement("button");
  closeBtn2.className = "tel2qr-btn tel2qr-btn-primary";
  closeBtn2.textContent = "Close";
  closeBtn2.addEventListener("click", removeModal);
  waActions.append(waOpenBtn, closeBtn2);
  waPane.append(waCanvas, waHint, waActions);

  // Tab switching
  callTab.addEventListener("click", () => {
    callTab.classList.add("active"); waTab.classList.remove("active");
    callPane.classList.remove("hidden"); waPane.classList.add("hidden");
  });
  waTab.addEventListener("click", () => {
    waTab.classList.add("active"); callTab.classList.remove("active");
    waPane.classList.remove("hidden"); callPane.classList.add("hidden");
  });

  card.append(number, tabs, callPane, waPane);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === overlay) removeModal();
  });

  await Promise.all([
    QRCode.toCanvas(callCanvas, telHref, { width: 200, margin: 2, color: { dark: "#111111", light: "#ffffff" } }),
    QRCode.toCanvas(waCanvas, waUrl, { width: 200, margin: 2, color: { dark: "#128C7E", light: "#ffffff" } }),
  ]);
}

// ── New-tab: data URL page ────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function openInNewTab(href: string): Promise<void> {
  const number = decodeURIComponent(href.replace(/^tel:/i, ""));
  const waUrl = toWhatsAppUrl(href);

  const [callQrSrc, waQrSrc] = await Promise.all([
    QRCode.toDataURL(href, { width: 200, margin: 2, color: { dark: "#111111", light: "#ffffff" } }),
    QRCode.toDataURL(waUrl, { width: 200, margin: 2, color: { dark: "#128C7E", light: "#ffffff" } }),
  ]);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tel2QR — ${escHtml(number)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;
     background:#f5f5f7;font-family:system-ui,sans-serif;padding:24px}
.card{background:#fff;border-radius:20px;padding:32px 28px 24px;
      box-shadow:0 8px 40px rgba(0,0,0,.12);display:flex;flex-direction:column;
      align-items:center;gap:14px;max-width:300px;width:100%;text-align:center}
.num{font-size:22px;font-weight:700;color:#111;word-break:break-all}
.tabs{display:flex;width:100%;gap:4px;background:#f0f0f0;border-radius:8px;padding:3px}
.tab{flex:1;padding:6px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#666;transition:all .15s}
.tab.active{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.pane{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.pane.hidden{display:none}
.hint{font-size:12px;color:#888}
img{border-radius:8px}
button{width:100%;padding:9px;border:none;border-radius:8px;background:#f0f0f0;
       color:#333;font-size:13px;font-weight:600;cursor:pointer}
button:hover{background:#e0e0e0}
</style>
</head>
<body>
<div class="card">
  <p class="num" id="n">${escHtml(number)}</p>
  <div class="tabs">
    <button class="tab active" id="t-call" onclick="switchTab('call')">Call</button>
    <button class="tab" id="t-wa" onclick="switchTab('wa')">WhatsApp</button>
  </div>
  <div class="pane" id="p-call">
    <img src="${callQrSrc}" width="200" height="200" alt="QR code to call">
    <p class="hint">Point your phone camera at this QR code</p>
    <button id="c">Copy number</button>
  </div>
  <div class="pane hidden" id="p-wa">
    <img src="${waQrSrc}" width="200" height="200" alt="QR code for WhatsApp">
    <p class="hint">Scan to open WhatsApp and call</p>
    <button id="w">Open WhatsApp</button>
  </div>
</div>
<script>
var WA_URL=${JSON.stringify(waUrl)};
function switchTab(t){
  ['call','wa'].forEach(function(id){
    document.getElementById('t-'+id).classList.toggle('active',id===t);
    document.getElementById('p-'+id).classList.toggle('hidden',id!==t);
  });
}
document.getElementById('c').onclick=function(){
  var n=document.getElementById('n').textContent,b=this;
  navigator.clipboard.writeText(n)
    .then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy number'},2e3)})
    .catch(function(){});
};
document.getElementById('w').onclick=function(){window.open(WA_URL,'_blank');};
</script>
</body>
</html>`;

  void chrome.runtime.sendMessage({
    type: "open-tab",
    url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  });
}

// ── Click handler ─────────────────────────────────────────────────────────────

document.addEventListener(
  "click",
  (e: MouseEvent) => {
    const target = e.target as Element | null;
    const link = target?.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || !/^tel:/i.test(href)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (method === "extension-popup") {
      void chrome.runtime.sendMessage({ type: "open-popup", tel: href });
    } else if (method === "new-tab" || method === "github-pages") {
      void openInNewTab(href);
    } else {
      void showModal(href);
    }
  },
  true
);

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") removeModal();
});
