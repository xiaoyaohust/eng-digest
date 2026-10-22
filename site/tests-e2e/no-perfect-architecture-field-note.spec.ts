import { expect, test } from "@playwright/test";

test("no perfect architecture Field Note publishes in its topic with diagrams and a share card", async ({ page, request }) => {
  const slug = "why-no-architecture-is-perfect";
  const path = `/field-notes/${slug}/`;
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: "System Design Fundamentals", exact: true }),
  });
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Why No Architecture Is Perfect");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Further reading", exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const tables = page.locator(".prose .table-scroll");
  await expect(tables).toHaveCount(3);
  await expect(tables.locator("table")).toHaveCount(3);
  const comparison = page.getByRole("region", { name: "Architecture candidate comparison" });
  expect(await comparison.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await comparison.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => comparison.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const diagram = page.locator(".prose .mermaid-diagram").first();
  expect(await diagram.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
