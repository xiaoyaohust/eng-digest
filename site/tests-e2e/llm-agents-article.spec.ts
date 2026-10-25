import { expect, test } from "@playwright/test";

const path = "/ai/large-language-models-and-agents/";
const previous = "/ai/discriminative-and-generative-models/";
const title = "Large Language Models and Agents";

test("LLM and agents lesson joins the AI sequence with rendered teaching material and a share image", async ({ page, request }) => {
  await page.goto("/ai/");
  const hrefs = await page.locator(".ai-library .article-card").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs.indexOf(path)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf(path)).toBeLessThan(hrefs.indexOf(previous));
  await page.locator(`.ai-library a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  expect(await page.locator(".prose").textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(2);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose")).toContainText("The substitute follows a fixed rule");
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(4);
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  const article = schemas.find((schema: { "@type": string }) => schema["@type"] === "Article");
  expect(article.headline).toBe(title);
  expect(article.inLanguage).toBe("en");
  expect(article.articleSection).toBe("AI Foundations");
  const imagePath = "/social/auto/ai/large-language-models-and-agents.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    expect(await diagram.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await diagram.screenshot({ path: `test-results/llm-agents-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.locator(".prose .katex-display").first().screenshot({ path: "test-results/llm-agents-equation.png" });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(2);
  await page.locator(".prose .mermaid-diagram").last().screenshot({ path: "test-results/llm-agents-diagram-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.goto("/tags/ai-fundamentals/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Large Language Models and Agents");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("agent diagrams, equations, and tables remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  const table = page.getByRole("region", { name: "Illustrative order-support agent trace" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/llm-agents-mobile.png" });
});

test("agent teaching diagrams and equations render without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await context.close();
});
