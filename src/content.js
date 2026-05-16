import QRCode from "qrcode";

const MODAL_ID = "tel2qr-modal";

function removeModal() {
  document.getElementById(MODAL_ID)?.remove();
}

function injectStyles() {
  if (document.getElementById("tel2qr-styles")) return;
  const style = document.createElement("style");
  style.id = "tel2qr-styles";
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
    #tel2qr-modal .tel2qr-close {
      margin-top: 4px;
      padding: 8px 24px;
      border: none;
      border-radius: 8px;
      background: #f0f0f0;
      color: #333;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    #tel2qr-modal .tel2qr-close:hover {
      background: #e0e0e0;
    }
  `;
  document.head.appendChild(style);
}

async function showModal(telHref) {
  removeModal();
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "QR code for " + telHref);

  const card = document.createElement("div");
  card.className = "tel2qr-card";

  const title = document.createElement("p");
  title.className = "tel2qr-title";
  title.textContent = "Scan to call";

  const number = document.createElement("p");
  number.className = "tel2qr-number";
  // Show the human-readable number without the "tel:" scheme
  number.textContent = decodeURIComponent(telHref.replace(/^tel:/i, ""));

  const canvas = document.createElement("canvas");

  const hint = document.createElement("p");
  hint.className = "tel2qr-hint";
  hint.textContent = "Point your phone camera at this QR code";

  const closeBtn = document.createElement("button");
  closeBtn.className = "tel2qr-close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", removeModal);

  card.append(title, number, canvas, hint, closeBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  await QRCode.toCanvas(canvas, telHref, {
    width: 200,
    margin: 2,
    color: { dark: "#111111", light: "#ffffff" },
  });

  // Close on backdrop click (outside the card)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) removeModal();
  });
}

document.addEventListener(
  "click",
  (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || !/^tel:/i.test(href)) return;

    e.preventDefault();
    e.stopPropagation();
    showModal(href);
  },
  true // capture phase so we run before the page's own handlers
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeModal();
});
