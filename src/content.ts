import QRCode from "qrcode";
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

const MODAL_ID = "tel2qr-modal";
const STYLES_ID = "tel2qr-styles";

let method = "overlay";
chrome.storage.sync.get({ method: "overlay" }, (r) => { method = r.method as string; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.method) method = changes.method.newValue as string;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
}

function buildCountryOptions(select: HTMLSelectElement): void {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = getCountries()
    .map(code => ({ code, name: displayNames.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select country…";
  placeholder.disabled = true;
  select.appendChild(placeholder);

  for (const { code, name, dial } of countries) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${flagEmoji(code)} +${dial} ${name}`;
    select.appendChild(opt);
  }
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
      direction: ltr;
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
    #tel2qr-modal .tel2qr-country-row {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }
    #tel2qr-modal .tel2qr-country-label {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }
    #tel2qr-modal .tel2qr-country-select {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 12px;
      font-family: inherit;
      background: #fff;
      color: #111;
      cursor: pointer;
      min-width: 0;
    }
    #tel2qr-modal .tel2qr-country-select:disabled {
      background: #f5f5f5;
      color: #999;
      cursor: default;
      border-color: #e8e8e8;
    }
  `;
  document.head.appendChild(style);
}

async function showModal(telHref: string): Promise<void> {
  removeModal();
  injectStyles();

  const number = decodeURIComponent(telHref.replace(/^tel:/i, ""));
  const parsed = parsePhoneNumberFromString(number);
  const isInternational = !!parsed?.countryCallingCode;

  const { defaultCountryCode = "" } = await chrome.storage.sync.get("defaultCountryCode") as { defaultCountryCode?: string };

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `QR code for ${telHref}`);

  const card = document.createElement("div");
  card.className = "tel2qr-card";

  const numberEl = document.createElement("p");
  numberEl.className = "tel2qr-number";
  numberEl.textContent = number;

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

  // ── Call pane ────────────────────────────────────────────────────────────────
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

  // ── WhatsApp pane ─────────────────────────────────────────────────────────────

  // Country selector (always visible)
  const countryRow = document.createElement("div");
  countryRow.className = "tel2qr-country-row";
  const countryLabel = document.createElement("span");
  countryLabel.className = "tel2qr-country-label";
  countryLabel.textContent = "Country";
  const countrySelect = document.createElement("select");
  countrySelect.className = "tel2qr-country-select";
  buildCountryOptions(countrySelect);
  if (isInternational) {
    if (parsed!.country) countrySelect.value = parsed!.country;
    countrySelect.disabled = true;
  } else {
    countrySelect.value = defaultCountryCode;
  }
  countryRow.append(countryLabel, countrySelect);

  const noCountryHint = document.createElement("p");
  noCountryHint.className = "tel2qr-hint";
  noCountryHint.textContent = "Select a country code to generate QR";

  const waCanvas = document.createElement("canvas");
  const waHint = document.createElement("p");
  waHint.className = "tel2qr-hint";
  waHint.textContent = "Scan to open WhatsApp and call";

  const waActions = document.createElement("div");
  waActions.className = "tel2qr-actions";
  const waOpenBtn = document.createElement("button");
  waOpenBtn.className = "tel2qr-btn tel2qr-btn-secondary";
  waOpenBtn.textContent = "Open WhatsApp";
  const closeBtn2 = document.createElement("button");
  closeBtn2.className = "tel2qr-btn tel2qr-btn-primary";
  closeBtn2.textContent = "Close";
  closeBtn2.addEventListener("click", removeModal);
  waActions.append(waOpenBtn, closeBtn2);

  const waPane = document.createElement("div");
  waPane.className = "tel2qr-pane hidden";
  waPane.append(countryRow, noCountryHint, waCanvas, waHint, waActions);

  async function renderWaQr(): Promise<void> {
    const countryCode = (isInternational ? parsed!.country : countrySelect.value) as CountryCode | undefined;

    if (!countryCode) {
      noCountryHint.style.display = "";
      waCanvas.style.display = "none";
      waHint.style.display = "none";
      return;
    }

    noCountryHint.style.display = "none";
    waCanvas.style.display = "";
    waHint.style.display = "";

    const waUrl = isInternational
      ? `https://wa.me/${number.replace(/\D/g, "")}`
      : `https://wa.me/${getCountryCallingCode(countryCode)}${number.replace(/\D/g, "")}`;

    await QRCode.toCanvas(waCanvas, waUrl, { width: 200, margin: 2, color: { dark: "#128C7E", light: "#ffffff" } });
    waOpenBtn.onclick = () => { removeModal(); window.open(waUrl, "_blank"); };
  }

  countrySelect.addEventListener("change", () => void renderWaQr());

  // Tab switching
  callTab.addEventListener("click", () => {
    callTab.classList.add("active"); waTab.classList.remove("active");
    callPane.classList.remove("hidden"); waPane.classList.add("hidden");
  });
  waTab.addEventListener("click", () => {
    waTab.classList.add("active"); callTab.classList.remove("active");
    waPane.classList.remove("hidden"); callPane.classList.add("hidden");
  });

  card.append(numberEl, tabs, callPane, waPane);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === overlay) removeModal();
  });

  await Promise.all([
    QRCode.toCanvas(callCanvas, telHref, { width: 200, margin: 2, color: { dark: "#111111", light: "#ffffff" } }),
    renderWaQr(),
  ]);
}

// ── New-tab ───────────────────────────────────────────────────────────────────

function openInNewTab(href: string): void {
  const url = chrome.runtime.getURL(`handler.html?tel=${encodeURIComponent(href)}`);
  void chrome.runtime.sendMessage({ type: "open-tab", url });
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
      openInNewTab(href);
    } else {
      void showModal(href);
    }
  },
  true
);

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") removeModal();
});
