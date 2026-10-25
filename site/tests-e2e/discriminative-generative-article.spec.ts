import { expect, test } from "@playwright/test";

const path = "/ai/discriminative-and-generative-models/";
const previous = "/ai/ai-machine-learning-deep-learning/";
const title = "Discriminative and Generative Models";

test("generative models section follows the AI sequence and publishes math, diagrams, and sharing metadata", async ({ page, request }) => {
  await page.goto("/ai/");
  const links = page.locator('.ai-library .card-grid > a');
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  expect(hrefs.indexOf(previous)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf(path)).toBeGreaterThan(hrefs.indexOf(previous));
  await links.filter({ has: page.getByRole("heading", { name: title, exact: true }) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .katex-display")).toHaveCount(4);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(4);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator('.prev-next .prev-next-link').first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((entry: { "@type": string }) => entry["@type"] === "Article").headline).toBe(title);
  const imagePath = "/social/auto/ai/discriminative-and-generative-models.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  const sizes = [];
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    sizes.push(await diagram.evaluate((element, number) => ({ number, width: element.clientWidth, contentWidth: element.scrollWidth }), index + 1));
    await diagram.screenshot({ path: `test-results/generative-models-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  expect(sizes.filter((diagram) => diagram.contentWidth > diagram.width + 1)).toEqual([]);
  await page.locator(".prose .katex-display").last().screenshot({ path: "test-results/generative-models-equations.png", style: ".navbar { visibility: hidden !important; }" });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(2);
  await page.locator(".prose .katex-display").last().screenshot({ path: "test-results/generative-models-equations-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(previous);
  await page.locator('.prev-next .prev-next-link.next').click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.goto("/tags/generative-models/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Discriminative and Generative Models");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("generative models formulas, diagrams, and tables stay within the mobile page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .katex-display")).toHaveCount(4);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Synthetic training messages for a binary generative model" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  for (const formula of await page.locator(".prose .katex-display").all()) {
    expect(await formula.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await page.goto(path);
  await page.screenshot({ path: "test-results/generative-models-mobile.png" });
});
