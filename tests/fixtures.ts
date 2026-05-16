import { test as base, chromium, BrowserContext, Page } from "@playwright/test";
import path from "path";

interface Fixtures {
  browserContext: BrowserContext;
  newPage: (html: string) => Promise<Page>;
}

// Shared across all tests in a worker to avoid re-launching Chromium per test.
export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  browserContext: [
    async ({}, use) => {
      const extensionPath = path.join(__dirname, "..");
      const ctx = await chromium.launchPersistentContext("", {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });
      await use(ctx);
      await ctx.close();
    },
    { scope: "worker" },
  ],

  newPage: async ({ browserContext }, use) => {
    const pages: Page[] = [];
    await use(async (html: string) => {
      const page = await browserContext.newPage();
      pages.push(page);
      // Route any http://localhost/ request so Chrome sees a real HTTP origin
      // and injects the content script (matches <all_urls> in the manifest).
      await page.route("http://localhost/**", (route) =>
        route.fulfill({ contentType: "text/html", body: html })
      );
      await page.goto("http://localhost/");
      return page;
    });
    for (const p of pages) await p.close().catch(() => {});
  },
});

export { expect } from "@playwright/test";
