import { expect, test } from "@playwright/test";

const slug = "multimodal-content-moderation-platform";
const path = `/system-design/${slug}/`;
const card = `https://systemcraftlab.com/social/auto/system-design/${slug}.png`;

test("content moderation article renders its diagrams and LinkedIn preview", async ({ page, request }) => {
  await page.goto("/system-design/");
  await page.locator(`a[href="${path}"]`).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a Multi-Modal Content Moderation Platform");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(4, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", card);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");

  const response = await request.get(`/social/auto/system-design/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("content moderation architecture is scrollable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(4, { timeout: 30_000 });

  const diagram = page.locator(".prose .mermaid-diagram").first();
  const sizes = await diagram.evaluate((element) => ({ panel: element.clientWidth, scroll: element.scrollWidth }));
  expect(sizes.scroll).toBeGreaterThan(sizes.panel);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
