import { expect, test } from "@playwright/test";

const path = "/ai/from-rules-to-machine-learning/";
const title = "From Rule-Based Systems to Machine Learning";

test("AI Foundations is a top-level track with an English lesson, formulas, code, and share image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('.track-card[href="/ai/"]')).toBeVisible();
  await page.locator(".navbar .nav-links").getByRole("link", { name: "AI Foundations", exact: true }).click();
  await expect(page).toHaveURL(/\/ai\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Foundations");
  await page.getByRole("link", { name: /Start reading/ }).click();
  await expect(page).toHaveURL(new RegExp(path));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  expect(await page.locator(".prose").textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(2);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator('.prose pre[data-language="math"]')).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "AI Foundations", exact: true })).toHaveAttribute("href", "/ai/");
  await expect(page.locator("[data-article-actions]")).toHaveAttribute("data-summary", /#ArtificialIntelligence #MachineLearning #LearningAI/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").inLanguage).toBe("en");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").articleSection).toBe("AI Foundations");
  const imagePath = "/social/auto/ai/from-rules-to-machine-learning.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain("https://systemcraftlab.com/ai/");
  expect(sitemap).toContain(`https://systemcraftlab.com${path}`);

  await page.locator(".prose .mermaid-diagram").screenshot({ path: "test-results/ai-learning-diagram.png", style: ".navbar { visibility: hidden !important; }" });
  await page.locator(".prose .katex-display").last().screenshot({ path: "test-results/ai-learning-equation.png" });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.locator(".prose .katex-display").last().screenshot({ path: "test-results/ai-learning-equation-dark.png" });
  await page.goto("/tags/ai-fundamentals/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Rule-Based Systems to Machine Learning");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("new navigation, lesson tables, and math fit tablet and mobile screens", async ({ page }) => {
  for (const width of [390, 768, 1101, 1201, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ai/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const toggle = page.locator('label[for="nav-toggle"]');
    if (await toggle.isVisible()) await toggle.click();
    await expect(page.locator('.navbar .nav-links a[href="/ai/"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ai/");
  await page.screenshot({ path: "test-results/ai-foundations-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const formula of await page.locator(".prose .katex-display").all()) {
    expect(await formula.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  const table = page.getByRole("region", { name: "Independent synthetic email test examples" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/ai-foundations-mobile.png" });
});

test("formulas and the learning diagram are present without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Takeaways", exact: true })).toBeVisible();
  await context.close();
});
