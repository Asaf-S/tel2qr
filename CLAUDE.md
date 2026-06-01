# Tel2QR — Claude context

## What this project is

A Chrome Extension (MV3) that intercepts `tel:` link clicks on any page and shows a QR code instead of launching the OS phone app, so desktop users can scan and call from their phone.

## Key docs

- [docs/click-handler.md](docs/click-handler.md) — **Read this thoroughly whenever touching anything related to:** the content-script click listener, the `method` storage key, the three display methods (overlay / extension-popup / new-tab), the background message protocol (`open-popup` / `open-tab`), or the in-memory cache and `chrome.storage.onChanged` wiring. It documents the full flow from click to QR display for every method.

## Build

```txt
npm run build   # esbuild → dist/{content,background,popup,handler}.js
npm test        # Playwright
```
