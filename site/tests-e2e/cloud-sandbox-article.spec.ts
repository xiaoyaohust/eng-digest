import { expect, test } from "@playwright/test";

test("cloud sandbox article renders diagrams and serves its LinkedIn thumbnail", async ({ page, request }) => {
  await page.goto("/system-design/");
  await page.locator('a[href="/system-design/cloud-sandbox-platform/"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a Cloud Sandbox Platform for Untrusted Code");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(4, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", "https://systemcraftlab.com/social/auto/system-design/cloud-sandbox-platform.png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get("/social/auto/system-design/cloud-sandbox-platform.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);

  await page.setViewportSize({ width: 390, height: 844 });
  const diagram = page.locator(".prose .mermaid-diagram").first();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const sizes = await diagram.evaluate((element) => ({ panel: element.clientWidth, scroll: element.scrollWidth }));
  expect(sizes.scroll).toBeGreaterThan(sizes.panel);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
