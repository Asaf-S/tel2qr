import QRCode from "qrcode";

const MODAL_ID = "tel2qr-modal";
const STYLES_ID = "tel2qr-styles";

// Cache the method preference so the click handler is synchronous.
let method = "overlay";
chrome.storage.sync.get({ method: "overlay" }, (r) => { method = r.method as string; });
chrome.storage.onChanged.addListener((changes) => {
  if (changes.method) method = changes.method.newValue as string;
});

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
  `;
  document.head.appendChild(style);
}

async function showModal(telHref: string): Promise<void> {
  removeModal();
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `QR code for ${telHref}`);

  const card = document.createElement("div");
  card.className = "tel2qr-card";

  const title = document.createElement("p");
  title.className = "tel2qr-title";
  title.textContent = "Scan to call";

  const number = document.createElement("p");
  number.className = "tel2qr-number";
  number.textContent = decodeURIComponent(telHref.replace(/^tel:/i, ""));

  const canvas = document.createElement("canvas");

  const hint = document.createElement("p");
  hint.className = "tel2qr-hint";
  hint.textContent = "Point your phone camera at this QR code";

  const actions = document.createElement("div");
  actions.className = "tel2qr-actions";

  const openBtn = document.createElement("button");
  openBtn.className = "tel2qr-btn tel2qr-btn-secondary";
  openBtn.textContent = "Open in app";
  openBtn.addEventListener("click", () => {
    removeModal();
    window.location.href = telHref;
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "tel2qr-btn tel2qr-btn-primary tel2qr-close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", removeModal);

  actions.append(openBtn, closeBtn);
  card.append(title, number, canvas, hint, actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  await QRCode.toCanvas(canvas, telHref, {
    width: 200,
    margin: 2,
    color: { dark: "#111111", light: "#ffffff" },
  });

  overlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === overlay) removeModal();
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
    } else if (method === "github-pages") {
      window.open(
        `https://asaf-s.github.io/tel2qr/?tel=${encodeURIComponent(href)}`,
        "_blank"
      );
    } else {
      void showModal(href); // default: overlay
    }
  },
  true
);

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") removeModal();
});
