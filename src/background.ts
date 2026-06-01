chrome.runtime.onMessage.addListener((msg: { type: string; tel: string; url: string }) => {
  if (msg.type === "open-popup") {
    void handleOpenPopup(msg.tel);
  } else if (msg.type === "open-tab") {
    void chrome.tabs.create({ url: msg.url });
  }
});

async function handleOpenPopup(tel: string): Promise<void> {
  const relativeUrl = `handler.html?tel=${encodeURIComponent(tel)}`;

  // Point the action popup at the QR handler page, then open it.
  await chrome.action.setPopup({ popup: relativeUrl });

  const openPopup = (chrome.action as typeof chrome.action & {
    openPopup?: () => Promise<void>;
  }).openPopup;

  if (openPopup) {
    try {
      await openPopup();
      return;
    } catch {
      // Fall through to the window fallback below.
    }
  }

  // Fallback for Chrome < 127: open a standalone popup window.
  chrome.action.setPopup({ popup: "popup.html" });
  void chrome.windows.create({
    url: chrome.runtime.getURL(relativeUrl),
    type: "popup",
    width: 340,
    height: 480,
    focused: true,
  });
}
