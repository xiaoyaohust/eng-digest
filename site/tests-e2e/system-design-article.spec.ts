import { expect, test } from "@playwright/test";

test("secure Copilot article publishes rendered diagrams and a LinkedIn image", async ({ page, request }) => {
  await page.goto("/system-design/");
  await page.locator('a[href="/system-design/secure-enterprise-copilot-api/"]').click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a Secure Enterprise Copilot API");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(4, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);

  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toBe("https://systemcraftlab.com/social/auto/system-design/secure-enterprise-copilot-api.png");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");

  const response = await request.get("/social/auto/system-design/secure-enterprise-copilot-api.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("Copilot architecture diagrams remain readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/system-design/secure-enterprise-copilot-api/");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(4, { timeout: 30_000 });

  const diagram = page.locator(".prose .mermaid-diagram").first();
  const sizes = await diagram.evaluate((element) => {
    const svg = element.querySelector("svg");
    return { panel: element.clientWidth, scroll: element.scrollWidth, svg: svg?.getBoundingClientRect().width ?? 0 };
  });
  expect(sizes.scroll).toBeGreaterThan(sizes.panel);
  expect(sizes.svg).toBeGreaterThan(1000);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
