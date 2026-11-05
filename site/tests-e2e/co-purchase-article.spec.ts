import { expect, test } from "@playwright/test";

const slug = "most-frequently-co-purchased-items";
const path = `/coding/${slug}/`;
const title = "Most Frequently Co-Purchased Items";

test("co-purchase article is discoverable with executable examples and social metadata", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  for (const name of ["Problem", "Java solution", "Python solution", "Expected output", "Complexity"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const card = await request.get(`/social/auto/coding/${slug}.png`);
  expect(card.ok()).toBe(true);
  expect(card.headers()["content-type"]).toContain("image/png");
  const png = await card.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/co-purchase-diagram-light.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/co-purchase-diagram-dark.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("co-purchase article stays readable on mobile without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Shopping basket pair counts" }).locator("table")).toBeVisible();
  const dimensions = await page.locator("html").evaluate(element => ({ width: element.scrollWidth, viewport: innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/co-purchase-diagram-mobile.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await context.close();
});
