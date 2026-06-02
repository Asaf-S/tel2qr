import QRCode from "qrcode";

// Restore the settings popup for the next toolbar click.
void chrome.action.setPopup({ popup: "popup.html" });

function toWhatsAppUrl(telHref: string): string {
  const digits = telHref.replace(/^tel:/i, "").replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const telHref = decodeURIComponent(params.get("tel") ?? "");
  const number = telHref.replace(/^tel:/i, "");
  const waUrl = toWhatsAppUrl(telHref);

  document.getElementById("number")!.textContent = number;

  await Promise.all([
    QRCode.toCanvas(
      document.getElementById("qr-call") as HTMLCanvasElement,
      telHref,
      { width: 200, margin: 2, color: { dark: "#111111", light: "#ffffff" } }
    ),
    QRCode.toCanvas(
      document.getElementById("qr-wa") as HTMLCanvasElement,
      waUrl,
      { width: 200, margin: 2, color: { dark: "#128C7E", light: "#ffffff" } }
    ),
  ]);

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

  document.getElementById("wa-open-btn")!.addEventListener("click", () => {
    window.open(waUrl, "_blank");
  });

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
