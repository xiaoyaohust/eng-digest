import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { calculateCLS, observePerformance, type PerformanceLog } from "./helpers/performance";

const mathArticle = "/ai/from-rules-to-machine-learning/";
const plainArticle = "/ai/ai-machine-learning-deep-learning/";
const paths = ["/", "/#about-founder", "/ai/", plainArticle, mathArticle];

async function readMetrics(page: Page) {
  // Flush fonts and two painted frames, then allow late observer delivery.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const log = (window as Window & { __performanceLog?: PerformanceLog }).__performanceLog;
    if (!log) throw new Error("Performance observers were not installed before navigation");
    return log;
  });
}

for (const profile of [
  { name: "desktop", viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]) {
  test(`${profile.name}: bounded CLS and LCP on first and repeat visits`, async ({ browser, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    const samples = [];
    for (const path of paths) {
      // A new context per URL gives each first visit its own empty cache.
      const context = await browser.newContext({ baseURL, ...profile });
      try {
        await context.addInitScript(observePerformance);
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        // Isolate the site's performance from the external analytics service;
        // CDP blocking, unlike Playwright routing, leaves browser caching enabled.
        await cdp.send("Network.setBlockedURLs", { urls: ["*static.cloudflareinsights.com/*"] });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 2 });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false, latency: 100, downloadThroughput: 187_500, uploadThroughput: 93_750,
        });
        for (const visit of ["first", "repeat"]) {
          await page.goto(path);
          const log = await readMetrics(page);
          const cls = calculateCLS(log.shifts);
          samples.push({ path, visit, cls, lcp: log.lcp, shifts: log.shifts });
          // Persist even successful samples and partial runs. The CI artifact
          // can then retain diagnostics independently of the selected reporter.
          await writeFile(testInfo.outputPath(`${profile.name}-web-vitals.json`), JSON.stringify(samples, null, 2));
          expect(log.supported).toContain("layout-shift");
          expect(log.supported).toContain("largest-contentful-paint");
          expect(cls, JSON.stringify(samples.at(-1))).toBeLessThanOrEqual(0.1);
          expect(log.lcp).toBeGreaterThan(0);
          // A lab ceiling for this fixed profile, not a claim about field P75.
          expect(log.lcp, `${path} ${visit} LCP`).toBeLessThanOrEqual(2500);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      } finally { await context.close(); }
    }
    await testInfo.attach(`${profile.name}-web-vitals.json`, { path: testInfo.outputPath(`${profile.name}-web-vitals.json`), contentType: "application/json" });
  });
}

test("a delayed founder portrait keeps its frame and surrounding content in place", async ({ page }) => {
  await page.addInitScript(observePerformance);
  let release!: () => void;
  const imageGate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/images/yao-xiao.jpg", async (route) => { await imageGate; await route.continue(); });
  const rectangles = () => page.locator(".portrait-frame, .founder-card, .tracks-section").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + scrollY, width: rect.width, height: rect.height };
  }));
  try {
    await page.goto("/#about-founder", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".portrait-frame")).toBeVisible();
    await readMetrics(page);
    const before = await rectangles();
    // querySelectorAll returns document order: card, portrait, next section.
    expect(Math.abs(before[1].width - before[1].height)).toBeLessThanOrEqual(1);
    release();
    await page.locator(".portrait-frame img").evaluate((image: HTMLImageElement) => image.decode());
    const log = await readMetrics(page);
    const after = await rectangles();
    for (let index = 0; index < before.length; index++) {
      for (const key of ["top", "width", "height"] as const) expect(Math.abs(after[index][key] - before[index][key])).toBeLessThanOrEqual(1);
    }
    expect(calculateCLS(log.shifts), JSON.stringify(log.shifts)).toBeLessThanOrEqual(0.1);
  } finally { release(); }
});

test("math assets are conditional, self-hosted, and all requested fonts resolve", async ({ page }) => {
  const mathRequests: string[] = [];
  const badResponses: string[] = [];
  page.on("request", (request) => { if (/katex/i.test(request.url())) mathRequests.push(request.url()); });
  page.on("response", (response) => { if (/katex/i.test(response.url()) && !response.ok()) badResponses.push(response.url()); });
  await page.goto(plainArticle);
  await readMetricsWithoutObserver(page);
  expect(mathRequests).toEqual([]);
  expect(await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.every((link) => link.parentElement?.tagName === "HEAD"))).toBe(true);
  // Check the actual CSS bodies as well: conditional Astro markup alone does
  // not prove a static CSS import was removed from another bundled stylesheet.
  for (const href of await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href))) {
    const css = await (await page.request.get(href)).text();
    expect(css).not.toMatch(/@font-face[^}]*KaTeX|\.katex\{/);
  }
  await page.goto(mathArticle);
  await readMetricsWithoutObserver(page);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  await expect(page.locator(".katex-display")).toHaveCount(2);
  expect(mathRequests.some((url) => url.endsWith("katex.min.css"))).toBe(true);
  expect(mathRequests.some((url) => url.endsWith(".woff2"))).toBe(true);
  expect(mathRequests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(badResponses).toEqual([]);
  // Validate every declared WOFF2 URL, including fonts these two formulas do
  // not happen to use. A successful CSS request alone cannot catch broken
  // relative font paths in a copied stylesheet.
  const stylesheetURL = await page.locator('head link[href*="/vendor/katex/"]').evaluate((link: HTMLLinkElement) => link.href);
  const css = await (await page.request.get(stylesheetURL)).text();
  const fonts = [...new Set([...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((match) => match[1].replace(/["']/g, "")))];
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) {
    const response = await page.request.get(new URL(font, stylesheetURL).href);
    expect(response.ok(), font).toBe(true);
    expect(response.headers()["content-type"]).toContain("font/woff2");
  }
});

async function readMetricsWithoutObserver(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test("diagram intrinsic dimensions and theme changes preserve geometry", async ({ page }) => {
  await page.goto("/ai/large-language-models-and-agents/");
  const diagrams = page.locator(".mermaid-diagram");
  const dimensions = () => diagrams.evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  for (const svg of await diagrams.locator("svg").all()) {
    const geometry = await svg.evaluate((element) => ({ width: Number(element.getAttribute("width")), height: Number(element.getAttribute("height")) }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
  }
  const light = await dimensions();
  expect(light.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  const dark = await dimensions();
  for (let index = 0; index < light.length; index++) {
    expect(Math.abs(light[index].width - dark[index].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(light[index].height - dark[index].height)).toBeLessThanOrEqual(1);
  }
  expect(await page.locator("html").evaluate((element) => getComputedStyle(element).scrollbarGutter)).toBe("stable");
});
