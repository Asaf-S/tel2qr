chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void chrome.tabs.create({ url: "https://asaf-s.github.io/tel2qr/" });
  }
});
