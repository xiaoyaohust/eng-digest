import { expect, test } from "@playwright/test";

const path = "/ai/ai-capabilities-and-limits/";
const previous = "/ai/training-inference-and-deployment/";
const title = "AI Capabilities and Their Limits";

test("AI capabilities lesson publishes its worked example, visual, and share metadata", async ({ page, request }) => {
  await page.goto("/ai/");
  const hrefs = await page.locator(".ai-library .article-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));
  expect(hrefs.indexOf(path)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf(previous)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf(path)).toBeLessThan(hrefs.indexOf(previous));
  await page.locator(`.ai-library a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .katex-display")).toHaveCount(3);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(3);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator('head link[href*="/vendor/katex/"]')).toHaveCount(1);
  expect(await page.locator(".prose").textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const imagePath = "/social/auto/ai/ai-capabilities-and-limits.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  expect(await page.locator(".mermaid-diagram").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/ai-capabilities-routing.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".mermaid-dark:visible")).toHaveCount(1);
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/ai-capabilities-routing-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.goto("/tags/ai-fundamentals/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("AI capabilities lesson tables, diagram, and equations fit mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["AI task families and evidence needed for evaluation", "Synthetic ticket scores and automatic routing decisions"]) {
    const table = page.getByRole("region", { name, exact: true });
    await table.focus();
    expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  const diagram = page.locator(".mermaid-diagram");
  expect(await diagram.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  if (await diagram.evaluate((element) => element.scrollWidth > element.clientWidth + 1)) {
    await diagram.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  for (const equation of await page.locator(".katex-display").all()) {
    expect(await equation.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  }
  await page.goto(path);
  await page.screenshot({ path: "test-results/ai-capabilities-mobile.png" });
});

test("AI capabilities teaching material remains available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator(".katex-display")).toHaveCount(3);
    await expect(page.locator('head link[href*="/vendor/katex/"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  } finally { await context.close(); }
});
