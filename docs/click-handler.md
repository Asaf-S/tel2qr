# Tel link click-handler — storage, routing, and per-method flow

## Overview

When a user clicks any `tel:` link on any page, the content script (`src/content.ts`) intercepts the click, reads the user's preferred display method from a module-level cache, and routes to one of three QR-display flows.

---

## Storage

**Key:** `method`
**Area:** `chrome.storage.sync` (synced across the user's Chrome profile)
**Possible values:** `"overlay"` | `"extension-popup"` | `"new-tab"`
**Default when unset:** `"overlay"`

The user changes this value via the action popup (`popup.html` + `src/popup.ts`), which writes to storage immediately on radio change:

```ts
await chrome.storage.sync.set({ method: r.value });
```

---

## In-memory cache in the content script

Reading storage on every click would add IPC latency before the QR appears, so `src/content.ts` caches the value in a module-level variable:

```ts
let method = "overlay";
chrome.storage.sync.get({ method: "overlay" }, (r) => { method = r.method as string; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.method) method = changes.method.newValue as string;
});
```

- The initial `get` populates the cache as soon as the content script loads.
- The `onChanged` listener (with `area === "sync"` guard) updates the cache whenever the user saves a new preference in the popup — no page reload needed.
- The `area` check is required: `onChanged` fires for all storage areas (`sync`, `local`, `managed`, `session`), so omitting it would incorrectly match a hypothetical `local` key also named `method`.

---

## Click interception

A single **capturing** listener is attached to `document` so it runs before any page-level handlers:

```ts
document.addEventListener("click", (e: MouseEvent) => { ... }, true);
```

For every click it:

1. Walks up the DOM from the clicked element to find the nearest `<a href>` ancestor.
2. Checks whether `href` matches `/^tel:/i`.
3. If not a tel link — returns immediately (no interference with normal page behavior).
4. If it **is** a tel link:
   - Calls `e.preventDefault()` — stops the browser from launching the OS phone app.
   - Calls `e.stopImmediatePropagation()` — prevents other listeners on the same element from receiving the click.
   - Routes based on the cached `method`.

---

## Per-method routing

### `overlay` (default)

```ts
void showModal(href);
```

- Injects a `<style>` block once into `<head>` (idempotent — skipped if already present).
- Builds a modal overlay `<div>` with a white card containing: title, phone number, QR `<canvas>`, hint text, and two buttons — **Open in app** and **Close**.
- Generates the QR code into the canvas via `QRCode.toCanvas()` (the `qrcode` npm package, bundled into `dist/content.js`).
- **Open in app** button: calls `window.location.href = telHref` to hand off to the OS phone app.
- **Close** button and backdrop click: remove the modal from the DOM.
- Pressing `Escape` anywhere on the page also removes the modal (separate `keydown` listener).

### `extension-popup`

```ts
void chrome.runtime.sendMessage({ type: "open-popup", tel: href });
```

The content script sends a message to the **background service worker** (`src/background.ts`), which:

1. Constructs `handler.html?tel=<encoded tel>`.
2. Calls `chrome.action.setPopup({ popup: relativeUrl })` to temporarily swap the action popup to the QR handler page.
3. Calls `chrome.action.openPopup()` (Chrome 127+) to programmatically open the action popup.
4. **Fallback for Chrome < 127:** resets `setPopup` back to `popup.html` and opens a standalone `chrome.windows.create({ type: "popup", ... })` window pointing at `handler.html`.

`src/handler.ts` (loaded by `handler.html`) immediately restores the popup to `popup.html` so the next toolbar click returns to the settings page.

### `new-tab`

```ts
void openInNewTab(href);
```

- Generates the QR code as a data URL via `QRCode.toDataURL()`.
- Builds a complete self-contained HTML page as a template string (styles, number, `<img src="data:...">`, copy button).
- Sends the page to the background via `chrome.runtime.sendMessage({ type: "open-tab", url: "data:text/html;..." })`.
- The background calls `chrome.tabs.create({ url })` — content scripts cannot reliably open `data:` URLs directly, but the background service worker can.

---

## Sequence diagram

```
User clicks tel: link
        │
        ▼
content.ts capturing listener
  ├─ not a tel: link? → return (no-op)
  └─ tel: link
       ├─ preventDefault + stopImmediatePropagation
       └─ read cached `method`
            ├─ "overlay"          → showModal()         → DOM overlay on page
            ├─ "extension-popup"  → sendMessage()       → background → action popup / window
            └─ "new-tab"          → openInNewTab()      → sendMessage() → background → new tab
```

---

## Key invariant

The `method` cache in `content.ts` and the value in `chrome.storage.sync` are kept in sync via `onChanged`. If for any reason the cache is stale (e.g., extension context invalidated and re-injected mid-session), the next page load re-initialises the cache from storage, ensuring correct behaviour after reload.
