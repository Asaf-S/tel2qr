import QRCode from "qrcode";
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

void chrome.action.setPopup({ popup: "popup.html" });

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

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const telHref = decodeURIComponent(params.get("tel") ?? "");
  const number = telHref.replace(/^tel:/i, "");

  const parsed = parsePhoneNumberFromString(number);
  const isInternational = !!parsed?.countryCallingCode;

  document.getElementById("number")!.textContent = number;

  // Call QR — always renders immediately
  await QRCode.toCanvas(
    document.getElementById("qr-call") as HTMLCanvasElement,
    telHref,
    { width: 200, margin: 2, color: { dark: "#111111", light: "#ffffff" } }
  );

  document.getElementById("open-btn")!.addEventListener("click", () => {
    window.location.href = telHref;
  });

  const copyBtn = document.getElementById("copy-btn")!;
  copyBtn.addEventListener("click", () => {
    void navigator.clipboard.writeText(number).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy number"; }, 2000);
    });
  });

  // --- Country selector setup ---
  const select = document.getElementById("country-select") as HTMLSelectElement;
  buildCountryOptions(select);

  const { defaultCountryCode = "" } = await chrome.storage.sync.get("defaultCountryCode") as { defaultCountryCode?: string };

  const noCountryHint = document.getElementById("no-country-hint")!;
  const waQrWrap = document.getElementById("wa-qr-wrap")!;
  const waOpenBtn = document.getElementById("wa-open-btn")!;

  if (isInternational) {
    if (parsed!.country) select.value = parsed!.country;
    select.disabled = true;
  } else {
    select.value = defaultCountryCode;
  }

  function buildWaUrl(countryCode: CountryCode): string {
    if (isInternational) {
      return `https://wa.me/${number.replace(/\D/g, "")}`;
    }
    const dial = getCountryCallingCode(countryCode);
    return `https://wa.me/${dial}${number.replace(/\D/g, "")}`;
  }

  async function renderWaQr(): Promise<void> {
    const countryCode = (isInternational ? parsed!.country : select.value) as CountryCode | undefined;

    if (!countryCode) {
      waQrWrap.style.display = "none";
      noCountryHint.style.display = "";
      return;
    }

    noCountryHint.style.display = "none";
    waQrWrap.style.display = "flex";

    const waUrl = buildWaUrl(countryCode);

    await QRCode.toCanvas(
      document.getElementById("qr-wa") as HTMLCanvasElement,
      waUrl,
      { width: 200, margin: 2, color: { dark: "#128C7E", light: "#ffffff" } }
    );

    waOpenBtn.onclick = () => window.open(waUrl, "_blank");
  }

  await renderWaQr();

  select.addEventListener("change", () => void renderWaQr());

  // --- Tab switching ---
  const tabCall = document.getElementById("tab-call")!;
  const tabWa = document.getElementById("tab-wa")!;
  const paneCall = document.getElementById("pane-call")!;
  const paneWa = document.getElementById("pane-wa")!;

  tabCall.addEventListener("click", () => {
    tabCall.classList.add("active"); tabWa.classList.remove("active");
    paneCall.classList.remove("hidden"); paneWa.classList.add("hidden");
  });
  tabWa.addEventListener("click", () => {
    tabWa.classList.add("active"); tabCall.classList.remove("active");
    paneWa.classList.remove("hidden"); paneCall.classList.add("hidden");
  });
});
