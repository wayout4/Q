import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  assert.match(await page.title(), /Quantum OS/);
  await page.getByRole("button", { name: /Notes/ }).first().click();
  await page.locator("#notes-text").fill("Quantum acceptance test note");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.locator(".window-close").click();
  await page.locator('.app-tile[data-app="notes"]').click();
  assert.equal(await page.locator("#notes-text").inputValue(), "Quantum acceptance test note");
  await page.locator(".window-close").click();

  await page.locator('.app-tile[data-app="calculator"]').click();
  for (const key of ["1", "+", "2", "="]) {
    await page.locator('[data-key="' + key + '"]').click();
  }
  assert.equal(await page.locator("#calc-display").innerText(), "3");
  await page.locator(".window-close").click();

  await page.locator('.app-tile[data-app="network"]').click();
  assert.match(await page.locator(".window-body").innerText(), /Not verified/);
  await page.locator(".window-close").click();

  await page.locator('.app-tile[data-app="settings"]').click();
  await page.locator("#theme-select").selectOption("light");
  await page.getByRole("button", { name: "Apply appearance" }).click();
  assert.equal(await page.locator("body").evaluate(el => el.classList.contains("light")), true);
  await page.locator(".window-close").click();

  await page.locator("#app-search").fill("no-such-app");
  assert.equal(await page.locator(".app-tile:visible").count(), 0);
  assert.equal(await page.locator("#no-results").isVisible(), true);
  await page.locator("#app-search").fill("");

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth), true,
    "mobile viewport must not have horizontal page overflow");

  await page.context().setOffline(true);
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#network-label").innerText(), "Offline mode");
  await page.context().setOffline(false);

  assert.deepEqual(errors, [], "no uncaught browser JavaScript errors");
  console.log("PASS: launch, note persistence, calculator, network honesty, settings, search, mobile layout, offline transition, no page errors");
} finally {
  await browser.close();
}
