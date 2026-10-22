import { expect, test } from "@playwright/test";

const slug = "distributed-tree-count-async-messages";
const path = `/coding/${slug}/`;

test("distributed counting guide publishes runnable solutions, a diagram, and a share image", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Counting a Distributed Tree with Async Messages",
  );
  await expect(page.getByRole("heading", { name: "Problem", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Java solution", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python solution", exact: true })).toBeVisible();
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("O(N²)");
  await expect(page.locator(".prose")).toContainText("Permanent failure: timeout");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`,
  );
  const response = await request.get(`/social/auto/coding/${slug}.png`);
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/distributed-tree-count-diagram.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Counting a Distributed Tree");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});
