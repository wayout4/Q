import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".app-tile[data-app=\"qnumber\"]").count(), 1, "Q# app tile exists");
  await page.locator(".app-tile[data-app=\"qnumber\"]").click();
  assert.match(await page.locator("#q-number-message").innerText(), /Setup required/);
  assert.equal(await page.locator("#q-number-register").isDisabled(), true, "must not fabricate an offline Q#");
  await page.locator(".window-close").click();
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

  await page.locator('.app-tile[data-app="quantum"]').click();
  assert.match(await page.locator(".window-body").innerText(), /state-vector simulation/);
  await page.locator("#quantum-bell").click();
  const quantumState = await page.locator("#quantum-state").innerText();
  assert.match(quantumState, /50\.00%/);
  assert.match(await page.locator("#quantum-status").innerText(), /Bell pair prepared/);
  await page.locator("#quantum-measure").click();
  assert.match(await page.locator("#quantum-history").innerText(), /MEASURE/);
  await page.locator("#quantum-reset").click();
  assert.match(await page.locator("#quantum-status").innerText(), /total probability 1\.000000/);
  await page.locator(".window-close").click();

  await page.locator("#app-search").fill("no-such-app");
  assert.equal(await page.locator(".app-tile:visible").count(), 0);
  assert.equal(await page.locator("#no-results").isVisible(), true);
  await page.locator("#app-search").fill("");

  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1365]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth), true,
      `viewport ${width}px must not have horizontal page overflow`);
  }

  await page.context().setOffline(true);
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#network-label").innerText(), "Offline mode");
  await page.context().setOffline(false);

  assert.deepEqual(errors, [], "no uncaught browser JavaScript errors");
  assert.equal(await page.locator("html").getAttribute("data-quantum-booted"), "true",
    "startup marker must be present after app initialization");

  await page.evaluate(() => window.dispatchEvent(new ErrorEvent("error", { message: "synthetic recovery test" })));
  assert.equal(await page.locator("#quantum-fatal-screen").isVisible(), true,
    "fatal runtime errors must show a visible recovery screen");
  await page.locator("#quantum-fatal-screen button").click();
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator("html").getAttribute("data-quantum-booted"), "true",
    "reload recovery must return to a booted app");
  console.log("PASS: launch, note persistence, calculator, network honesty, settings, search, 8 viewport widths, offline transition, fatal-error recovery, reload recovery, no uncaught browser errors");
} finally {
  await browser.close();
}
