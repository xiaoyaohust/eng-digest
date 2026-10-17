import { expect, test } from "@playwright/test";

const slug = "real-time-ad-budget-pacing";
const path = `/system-design/${slug}/`;
const title = "Design a Real-Time Ad Budget and Pacing System";

test("ad accounting guide publishes five diagrams and a LinkedIn image", async ({ page, request }) => {
  await page.goto("/system-design/");
  const cluster = page.locator(".topic-cluster").filter({
    has: page.getByRole("heading", { name: "Data & ML Platforms", exact: true }),
  });
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(5, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("Reserved exposure is not automatically overspend.");
  await expect(page.locator(".prose")).toContainText("Expiry alone is not evidence that money is unused.");
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/system-design/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(`/social/auto/system-design/${slug}.png`);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    await diagram.screenshot({ path: `test-results/ad-budget-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.goto("/");
  await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Ad Budget and Pacing");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("ad accounting diagrams and reference tables stay usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(5, { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Advertising accounting records" });
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
  await page.screenshot({ path: "test-results/ad-budget-mobile.png" });
});
