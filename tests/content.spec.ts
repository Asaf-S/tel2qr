import { test, expect } from "./fixtures";

const TEL_PAGE = `<a href="tel:+15550100">Call us</a>`;

test("shows modal with number and QR canvas when clicking a tel: link", async ({
  newPage,
}) => {
  const page = await newPage(TEL_PAGE);
  await page.click("a");
  await expect(page.locator("#tel2qr-modal")).toBeVisible();
  await expect(page.locator(".tel2qr-number")).toHaveText("+15550100");
  await expect(page.locator("#tel2qr-modal canvas")).toBeVisible();
});

test("close button removes the modal", async ({ newPage }) => {
  const page = await newPage(TEL_PAGE);
  await page.click("a");
  await expect(page.locator("#tel2qr-modal")).toBeVisible();
  await page.click(".tel2qr-close");
  await expect(page.locator("#tel2qr-modal")).not.toBeAttached();
});

test("Escape key removes the modal", async ({ newPage }) => {
  const page = await newPage(TEL_PAGE);
  await page.click("a");
  await expect(page.locator("#tel2qr-modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#tel2qr-modal")).not.toBeAttached();
});

test("clicking the backdrop removes the modal", async ({ newPage }) => {
  const page = await newPage(TEL_PAGE);
  await page.click("a");
  await expect(page.locator("#tel2qr-modal")).toBeVisible();
  // Click top-left corner of the full-screen overlay — outside the centered card.
  await page.click("#tel2qr-modal", { position: { x: 5, y: 5 } });
  await expect(page.locator("#tel2qr-modal")).not.toBeAttached();
});

test("does not intercept non-tel: links", async ({ newPage }) => {
  const page = await newPage(`<a href="#">Not a phone number</a>`);
  await page.click("a");
  await expect(page.locator("#tel2qr-modal")).not.toBeAttached();
});

test("reopening a modal replaces the previous one", async ({ newPage }) => {
  const page = await newPage(`
    <a href="tel:+15550100">Call 1</a>
    <a href="tel:+15550200">Call 2</a>
  `);
  await page.click("a >> nth=0");
  await expect(page.locator(".tel2qr-number")).toHaveText("+15550100");
  // The modal overlay covers the page. Dispatch the click directly on the element
  // so the content script's document-level capture listener receives it.
  await page.evaluate(() =>
    (document.querySelectorAll("a")[1] as HTMLElement).click()
  );
  await expect(page.locator(".tel2qr-number")).toHaveText("+15550200");
  await expect(page.locator("#tel2qr-modal")).toHaveCount(1);
});

test("styles are injected only once across multiple modal opens", async ({
  newPage,
}) => {
  const page = await newPage(`
    <a href="tel:+15550100">Call 1</a>
    <a href="tel:+15550200">Call 2</a>
  `);
  await page.click("a >> nth=0");
  await page.keyboard.press("Escape");
  await page.click("a >> nth=1");
  await expect(page.locator("#tel2qr-styles")).toHaveCount(1);
});
