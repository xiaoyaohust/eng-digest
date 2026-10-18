import { expect, test } from "@playwright/test";

const slug = "ab-testing-platform";
const path = `/system-design/${slug}/`;
const title = "Design an A/B Testing Platform";
const image = `https://systemcraftlab.com/social/auto/system-design/${slug}.png`;

test("experimentation article publishes five diagrams and a LinkedIn preview", async ({ page, request }) => {
  await page.goto("/system-design/");
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(5, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="sql"]')).toHaveCount(1);
  await expect(page.locator(".prose")).toContainText("Result freshness does not imply outcome maturity");
  await expect(page.locator(".prose")).toContainText("A local SDK that is disconnected cannot observe the stop immediately.");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(`/social/auto/system-design/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    await diagram.screenshot({
      path: `test-results/ab-testing-diagram-${index + 1}.png`,
      style: ".navbar { visibility: hidden !important; }",
    });
  }
  // New publications rotate the homepage list; topic and tag archives retain older articles.
  await page.goto("/tags/experimentation/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("A/B Testing Platform");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("experimentation diagrams remain scrollable on mobile without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(5, { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("region", { name: "Experimentation API reference" }).locator("table")).toHaveCount(1);
  const diagram = page.locator(".prose .mermaid-diagram").first();
  const sizes = await diagram.evaluate((element) => ({ panel: element.clientWidth, scroll: element.scrollWidth }));
  expect(sizes.scroll).toBeGreaterThan(sizes.panel);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
