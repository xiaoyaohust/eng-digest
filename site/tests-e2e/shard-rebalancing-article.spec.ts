import { expect, test } from "@playwright/test";

const slug = "rebalance-overlapping-shard-ranges";
const path = `/coding/${slug}/`;
const title = "Rebalance Overlapping Shard Ranges";

test("shard rebalancing article publishes its solutions, diagram, and social card", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  for (const name of ["Problem", "Java solution", "Python solution", "Expected output", "Complexity"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("Nested deletion: [(A, 0, 100), (C, 101, 150)]");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(`/social/auto/coding/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/shard-rebalancing-diagram.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Shard rebalancing walkthrough" });
  await expect(table.locator("table")).toHaveCount(1);
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Rebalance Overlapping Shard Ranges");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});
