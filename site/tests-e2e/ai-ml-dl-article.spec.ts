import { expect, test } from "@playwright/test";

const path = "/ai/ai-machine-learning-deep-learning/";
const previous = "/ai/from-rules-to-machine-learning/";
const title = "How AI, Machine Learning, and Deep Learning Fit Together";

test("AI relationships section follows the first lesson and publishes diagrams and share metadata", async ({ page, request }) => {
  await page.goto("/ai/");
  const articleLinks = page.locator('.ai-library .card-grid > a');
  const hrefs = await articleLinks.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  expect(hrefs.indexOf(previous)).toBeGreaterThanOrEqual(0);
  expect(hrefs).toContain(path);
  await articleLinks.filter({ has: page.getByRole("heading", { name: title, exact: true }) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator(".prose")).toContainText("No prediction from such a network has been computed for this example");
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator('.prev-next .prev-next-link').first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const imagePath = "/social/auto/ai/ai-machine-learning-deep-learning.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((entry: { "@type": string }) => entry["@type"] === "Article").headline).toBe(title);
  expect(schemas.find((entry: { "@type": string }) => entry["@type"] === "Article").articleSection).toBe("AI Foundations");
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);

  const diagramSizes = [];
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    diagramSizes.push(await diagram.evaluate((element, number) => ({ number, width: element.clientWidth, contentWidth: element.scrollWidth }), index + 1));
    await diagram.screenshot({ path: `test-results/ai-relationships-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  expect(diagramSizes.filter((diagram) => diagram.contentWidth > diagram.width + 1)).toEqual([]);
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(2);
  await page.locator(".prose .mermaid-diagram").first().screenshot({ path: "test-results/ai-relationships-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(previous);
  await page.locator('.prev-next .prev-next-link.next').click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.goto("/tags/ai-fundamentals/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Deep Learning Fit Together");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("AI relationships diagrams and tables remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Synthetic messages and the existing learned threshold" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const diagram = page.locator(".prose .mermaid-diagram").first();
  expect(await diagram.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/ai-relationships-mobile.png" });
});
