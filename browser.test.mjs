import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const server = spawn(process.execPath, ["build.mjs", "--serve"], { env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"] });
let browser;
try {
  const [message] = await once(server.stdout, "data");
  const url = message.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(url, "test server started");
  const executablePath = process.env.CHROME_HEADLESS_SHELL_PATH;
  browser = await chromium.launch(executablePath ? { executablePath } : { channel: "chrome" });
  const context = await browser.newContext({ acceptDownloads: true });
  const external = [];
  await context.route("**/*", async route => {
    if (route.request().url().startsWith(url + "/")) return route.continue();
    external.push(route.request().url());
    await route.abort();
  });
  const page = await context.newPage();
  await page.route("**/firebase-config.json", route => route.fulfill({ status: 404, body: "" }));
  await page.goto(url);
  console.log("Unmodified browser model availability:", await page.evaluate(async () => {
    if (!window.LanguageModel) return "API absent";
    return await window.LanguageModel.availability();
  }));
  await page.getByLabel("Source line").selectOption("4");
  await page.getByLabel("Add to").selectOption("payment");
  await page.getByRole("button", { name: "Attach line" }).click();
  await page.getByRole("button", { name: "Remove line 4 from Pay and expenses" }).waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  assert.match(await readFile(await (await download).path(), "utf8"), /\[4\] The fixed fee is €80/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByLabel("The brief").fill("Remettre un fichier CSV.\nTarif de 20 euros.");
  assert.equal(await page.getByRole("button", { name: /Remove line/ }).count(), 0);
  await page.evaluate(() => Object.defineProperty(window, "LanguageModel", { configurable: true, value: undefined }));
  await page.getByRole("button", { name: "Find cited terms" }).click();
  await page.getByText(/This browser has no on-device model/).waitFor();
  assert.deepEqual(external, []);
  await page.getByLabel("AI processing").selectOption("hybrid");
  await page.getByRole("button", { name: "Find cited terms" }).click();
  await page.getByText(/needs its Firebase web configuration/).waitFor();
  console.log("Manual evidence, export, mobile layout, stale evidence reset and quiet local failure: passed.");

  // This is a transport fixture for Firebase's actual SDK, not Gemini inference.
  // Routes intercept all network activity outside the local test server.
  const modelPage = await context.newPage();
  await modelPage.route("**/firebase-config.json", route => route.fulfill({ json: {
    firebase: { apiKey: "fixture-local-only", projectId: "demo-brief", appId: "1:123:web:test" },
    recaptchaSiteKey: "fixture-site-key"
  }}));
  await modelPage.addInitScript(() => {
    Object.defineProperty(window, "LanguageModel", { configurable: true, value: {
      availability: async () => "available",
      create: async () => ({
        prompt: async contents => {
          window.fixtureSawSample = JSON.stringify(contents).includes("bookshop");
          return JSON.stringify({ deliverable: [2], payment: [4], timing: [3], conditions: [5] });
        },
        destroy() {}
      })
    }});
  });
  await modelPage.goto(url);
  await modelPage.getByRole("button", { name: "Find cited terms" }).click();
  await modelPage.getByText("Firebase AI Logic · on this device", { exact: true }).waitFor({ timeout: 10000 });
  assert.equal(await modelPage.evaluate(() => window.fixtureSawSample), true);
  assert.equal(await modelPage.getByRole("button", { name: /Remove line/ }).count(), 4);
  assert.equal(external.some(address => /generateContent/i.test(address)), false);
  console.log("Firebase SDK local routing, prompt, response source and citation wiring (test model): passed.");

  const fallbackPage = await context.newPage();
  await fallbackPage.addInitScript(() => {
    Object.defineProperty(window, "LanguageModel", { configurable: true, value: undefined });
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  });
  await fallbackPage.route("**/firebase-config.json", route => route.fulfill({ json: {
    firebase: { apiKey: "fixture-local-only", projectId: "demo-brief", appId: "1:123:web:test" },
    recaptchaSiteKey: "fixture-site-key", cloudEnabled: true
  }}));
  let attested = false;
  let routed = false;
  await fallbackPage.route("https://content-firebaseappcheck.googleapis.com/**", route => {
    attested = true;
    return route.fulfill({ json: { token: "local-test-only", ttl: "3600s" } });
  });
  await fallbackPage.route("https://firebasevertexai.googleapis.com/**", route => {
    const request = route.request();
    const sentHeaders = request.headers();
    routed = request.url().includes("generateContent") && request.postData().includes("bookshop") &&
      sentHeaders["x-firebase-appcheck"] === "local-test-only";
    return route.fulfill({ json: { candidates: [{ content: { role: "model", parts: [
      { text: JSON.stringify({ deliverable: [2], payment: [4], timing: [3], conditions: [5] }) }
    ] }, finishReason: "STOP" }] } });
  });
  await fallbackPage.goto(url);
  await fallbackPage.getByLabel("AI processing").selectOption("hybrid");
  await fallbackPage.getByRole("button", { name: "Find cited terms" }).click();
  await fallbackPage.getByText("Firebase AI Logic · in Google’s cloud", { exact: true }).waitFor({ timeout: 10000 });
  assert.ok(attested && routed);
  console.log("Firebase SDK cloud fallback and App Check header (intercepted fixtures): passed.");

  for (const mode of ["--public", "--hosting"]) {
    const instance = spawn(process.execPath, ["build.mjs", mode, "--serve"], { env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"] });
    const publicContext = await browser.newContext();
    try {
      const [data] = await once(instance.stdout, "data");
      const address = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
      const requests = [];
      await publicContext.route("**/*", route => {
        const target = route.request().url();
        requests.push(target);
        if (!target.startsWith(address + "/")) return route.abort();
        if (mode === "--hosting" && target.endsWith("/web-app.json")) {
          return route.fulfill({ json: { firebase: { apiKey: "fixture-local-only", projectId: "demo-brief", appId: "1:123:web:test" } } });
        }
        return route.continue();
      });
      await publicContext.addInitScript(() => Object.defineProperty(window, "LanguageModel", { value: {
        availability: async () => "available", create: async () => ({
          async prompt() { return JSON.stringify({ deliverable: [2], payment: [4], timing: [3], conditions: [] }); },
          destroy() {}
        })
      } }));
      const publicPage = await publicContext.newPage();
      await publicPage.goto(address);
      await publicPage.getByText("Read a recorded bookshop example").click();
      assert.match(await publicPage.locator("#recorded-lines").innerText(), /\[4\] The fixed fee is €80/);
      assert.equal(await publicPage.locator("#provenance").innerText(), "Manual review");
      await publicPage.getByText("Read a recorded bookshop example").click();
      assert.equal(await publicPage.getByLabel("AI processing").isVisible(), false);
      await publicPage.getByRole("button", { name: "Find cited terms" }).click();
      const label = (mode === "--public" ? "Chrome Gemini Nano" : "Firebase AI Logic") + " · on this device";
      await publicPage.getByText(label, { exact: true }).waitFor();
      assert.ok(requests.every(target => target.startsWith(address + "/")));
      assert.ok(requests.every(target => !target.endsWith("/firebase-config.json")));
      assert.equal(await publicContext.request.get(address + "/firebase-config.json").then(r => r.status()), 404);
      console.log(mode, "local-only review and private-configuration isolation (test model): passed.");
    } finally {
      await publicContext.close();
      instance.kill();
    }
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
