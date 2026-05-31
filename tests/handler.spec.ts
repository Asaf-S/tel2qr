import { test, expect, chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

function readFile(rel: string) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

// Serve a local HTML file at http://localhost/ and return page + browser.
// Requests to http://localhost/dist/*.js are served from the real dist/ folder.
async function openPage(html: string, search = "") {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route("http://localhost/**", (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.startsWith("/dist/") && pathname.endsWith(".js")) {
      const jsPath = path.join(__dirname, "..", pathname.slice(1));
      if (fs.existsSync(jsPath)) {
        return route.fulfill({
          contentType: "application/javascript",
          body: fs.readFileSync(jsPath),
        });
      }
    }
    return route.fulfill({ contentType: "text/html", body: html });
  });
  await page.goto("http://localhost/" + search);
  return { page, browser };
}

// ── docs/index.html — GitHub Pages handler ────────────────────────────────────

const docsHtml = readFile("docs/index.html");

test("docs QR mode: shows canvas and number when ?tel= present", async () => {
  const { page, browser } = await openPage(docsHtml, "?tel=tel%3A%2B15550100");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".number")).toHaveText("+15550100");
  await browser.close();
});

test("docs QR mode: strips tel: prefix from displayed number", async () => {
  const { page, browser } = await openPage(docsHtml, "?tel=tel%3A%2B19998887777");
  await expect(page.locator(".number")).toHaveText("+19998887777");
  await browser.close();
});

test("docs setup mode: register button visible when no ?tel= param", async () => {
  const { page, browser } = await openPage(docsHtml);
  await expect(page.locator(".btn-register")).toBeVisible();
  await browser.close();
});

test("docs setup mode: QR canvas not shown on setup page", async () => {
  const { page, browser } = await openPage(docsHtml);
  await expect(page.locator("canvas")).not.toBeAttached();
  await browser.close();
});

// ── handler.html — extension popup window ─────────────────────────────────────

const handlerHtml = readFile("handler.html");

test("handler: shows number and canvas for a tel: param", async () => {
  const { page, browser } = await openPage(
    handlerHtml,
    "?tel=tel%3A%2B15550100"
  );
  await expect(page.locator("#qr")).toBeVisible();
  await expect(page.locator("#number")).toHaveText("+15550100");
  await browser.close();
});

test("handler: strips tel: prefix from displayed number", async () => {
  const { page, browser } = await openPage(
    handlerHtml,
    "?tel=tel%3A%2B19998887777"
  );
  await expect(page.locator("#number")).toHaveText("+19998887777");
  await browser.close();
});

test("handler: copy and open-in-app buttons are present", async () => {
  const { page, browser } = await openPage(
    handlerHtml,
    "?tel=tel%3A%2B15550100"
  );
  await expect(page.locator("#copy-btn")).toBeVisible();
  await expect(page.locator("#open-btn")).toBeVisible();
  await browser.close();
});

// ── popup.html — settings chooser ─────────────────────────────────────────────

const popupHtml = readFile("popup.html");

test("popup: all three method radio buttons are present", async () => {
  const { page, browser } = await openPage(popupHtml);
  await expect(page.locator('input[value="overlay"]')).toBeAttached();
  await expect(page.locator('input[value="extension-popup"]')).toBeAttached();
  await expect(page.locator('input[value="github-pages"]')).toBeAttached();
  await browser.close();
});

test("popup: saved message is hidden on load", async () => {
  const { page, browser } = await openPage(popupHtml);
  await expect(page.locator("#saved")).not.toHaveClass(/visible/);
  await browser.close();
});
