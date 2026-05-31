import QRCode from "qrcode";

// Restore the settings popup for the next toolbar click.
void chrome.action.setPopup({ popup: "popup.html" });

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const telHref = decodeURIComponent(params.get("tel") ?? "");
  const number = telHref.replace(/^tel:/i, "");

  document.getElementById("number")!.textContent = number;

  await QRCode.toCanvas(
    document.getElementById("qr") as HTMLCanvasElement,
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
});
