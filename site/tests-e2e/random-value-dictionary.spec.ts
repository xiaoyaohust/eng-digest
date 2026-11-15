import { expect, test } from "@playwright/test";

const path = "/coding/random-value-dictionary/";
const title = "Random Values from a Dictionary: Frequency and Distinct Sampling";

test("random dictionary article publishes both solutions, sampling rules, search, and a share card", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/coding/"]')).toHaveAttribute("aria-current", "page");
  for (const name of ["Problem", "Java solution", "Python solution", "Expected output", "Why it works", "Complexity"])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("distinct after swap: 10");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const imagePath = "/social/auto/coding/random-value-dictionary.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  const diagram = page.locator(".mermaid-diagram");
  expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await diagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1000);
  await diagram.screenshot({ path: "test-results/random-dictionary-light.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".mermaid-dark:visible")).toHaveCount(1);
  await diagram.screenshot({ path: "test-results/random-dictionary-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto("/tags/randomization/");
  await expect(page.locator(`a.article-card[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Dictionary Frequency Distinct Sampling");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("random dictionary teaching remains usable on mobile without browser JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["Frequency-weighted and distinct-value sampling probabilities", "Random dictionary operation time and live storage"]) {
      const region = page.getByRole("region", { name, exact: true });
      expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await region.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    const diagram = page.locator(".mermaid-diagram");
    expect(await diagram.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    if (await diagram.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
      await diagram.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => diagram.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.goto(path);
    await page.screenshot({ path: "test-results/random-dictionary-mobile.png" });
  } finally { await context.close(); }
});
