import { expect, test } from "@playwright/test";

const path = "/ai/training-inference-and-deployment/";
const title = "Training, Inference, and Deployment";
const previous = "/ai/large-language-models-and-agents/";

test("model lifecycle lesson joins AI Foundations with static diagrams, math, and a share image", async ({ page, request }) => {
  await page.goto("/ai/");
  await expect(page.locator(".ai-library .article-card").first()).toHaveAttribute("href", path);
  await page.locator(`.ai-library a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .katex-display")).toHaveCount(1);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(1);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator('head link[href*="/vendor/katex/"]')).toHaveCount(1);
  expect(await page.locator(".prose").textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('[data-copy-value]')).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const imagePath = "/social/auto/ai/training-inference-and-deployment.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    await diagram.screenshot({ path: `test-results/model-lifecycle-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.locator(".katex-display").screenshot({ path: "test-results/model-lifecycle-equation.png" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(2);
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.goto("/tags/ai-fundamentals/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("model lifecycle diagrams, equation, and table remain accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Responsibilities of training, inference, and deployment" });
  await table.focus();
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  for (const diagram of await page.locator(".mermaid-diagram").all()) {
    const geometry = await diagram.evaluate((element) => ({
      right: element.getBoundingClientRect().right,
      width: element.clientWidth, scrollWidth: element.scrollWidth,
    }));
    expect(geometry.right).toBeLessThanOrEqual(390);
    expect(geometry.width).toBeGreaterThan(0);
    if (geometry.scrollWidth > geometry.width + 1) {
      await diagram.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    }
  }
  await page.goto(path);
  await page.screenshot({ path: "test-results/model-lifecycle-mobile.png" });
});

test("model lifecycle teaching material renders without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator(".mermaid-diagram svg:visible")).toHaveCount(2);
    await expect(page.locator(".katex-display")).toHaveCount(1);
    await expect(page.locator('head link[href*="/vendor/katex/"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  } finally { await context.close(); }
});
