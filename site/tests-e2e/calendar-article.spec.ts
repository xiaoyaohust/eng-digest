import { expect, test } from "@playwright/test";

const slug = "calendar-scheduling-system";
const path = `/system-design/${slug}/`;
const title = "Design a Calendar and Scheduling System";

test("calendar design publishes five rendered diagrams and a LinkedIn share image", async ({ page, request }) => {
  await page.goto("/system-design/");
  const cluster = page.locator(".topic-cluster").filter({
    has: page.getByRole("heading", { name: "Collaboration & Scheduling", exact: true }),
  });
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(4);
  await expect(page.locator(".prose")).toContainText("412 Precondition Failed");
  await expect(page.locator(".prose")).toContainText("Allocating increasing IDs outside commit order is unsafe");
  const reading = page.getByRole("heading", { name: "Further reading", exact: true });
  await expect(reading.locator("+ ul a")).toHaveCount(7);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/system-design/${slug}.png`,
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const response = await request.get(`/social/auto/system-design/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  const diagramSizes = [];
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    diagramSizes.push(await diagram.evaluate((element, number) => ({
      number, width: element.clientWidth, contentWidth: element.scrollWidth,
    }), index + 1));
    await diagram.screenshot({
      path: `test-results/calendar-diagram-${index + 1}.png`,
      style: ".navbar { visibility: hidden !important; }",
    });
  }
  expect(diagramSizes.filter((diagram) => diagram.contentWidth > diagram.width + 1)).toEqual([]);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Calendar and Scheduling System");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("calendar diagrams and tables remain usable on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5, { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Calendar daylight saving examples" });
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
  await page.screenshot({ path: "test-results/calendar-mobile.png" });
});
