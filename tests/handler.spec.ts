import { test, expect, chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const HTML = fs.readFileSync(
  path.join(__dirname, "..", "docs", "index.html"),
  "utf8"
);

// Serve docs/index.html via Playwright route — no extension needed.
async function newPage(search = "") {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route("http://localhost/**", (route) =>
    route.fulfill({ contentType: "text/html", body: HTML })
  );
  await page.goto("http://localhost/" + search);
  return { page, browser };
}

// ── QR mode ──────────────────────────────────────────────────────────────────

test("QR mode: shows canvas and number when ?tel= param present", async () => {
  const { page, browser } = await newPage("?tel=tel%3A%2B15550100");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".number")).toHaveText("+15550100");
  await browser.close();
});

test("QR mode: strips tel: prefix from displayed number", async () => {
  const { page, browser } = await newPage("?tel=tel%3A%2B19998887777");
  await expect(page.locator(".number")).toHaveText("+19998887777");
  await browser.close();
});

test("QR mode: copy-number button is visible", async () => {
  const { page, browser } = await newPage("?tel=tel%3A%2B15550100");
  await expect(page.locator(".btn-copy")).toBeVisible();
  await browser.close();
});

test("QR mode: register button is not shown", async () => {
  const { page, browser } = await newPage("?tel=tel%3A%2B15550100");
  await expect(page.locator(".btn-register")).not.toBeAttached();
  await browser.close();
});

// ── Setup mode ───────────────────────────────────────────────────────────────

test("setup mode: register button is visible when no ?tel= param", async () => {
  const { page, browser } = await newPage();
  await expect(page.locator(".btn-register")).toBeVisible();
  await browser.close();
});

test("setup mode: QR canvas is not shown", async () => {
  const { page, browser } = await newPage();
  await expect(page.locator("canvas")).not.toBeAttached();
  await browser.close();
});

test("setup mode: confirm message is hidden before clicking register", async () => {
  const { page, browser } = await newPage();
  await expect(page.locator(".confirm-msg")).not.toBeVisible();
  await browser.close();
});
