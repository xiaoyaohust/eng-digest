import { expect, test } from "@playwright/test";

const slug = "earliest-supported-library-version";
const path = `/coding/${slug}/`;
const title = "Find the Earliest Supported Library Version";

test("version search article publishes runnable solutions, static diagram, and a share image", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  for (const name of ["Problem", "Java solution", "Python solution", "Expected output", "Complexity"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const language of ["java", "python"]) {
    await expect(page.locator(`.prose pre[data-language="${language}"]`)).toHaveCount(1);
  }
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator(".prose")).toContainText("Group resets: 1.0.1 (API calls: 4)");
  const html = await (await request.get(path)).text();
  expect(html).toContain("mermaid-light");
  expect(html).toContain("mermaid-dark");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const response = await request.get(`/social/auto/coding/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  const diagram = page.locator(".prose .mermaid-diagram");
  expect(await diagram.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await diagram.screenshot({
    path: "test-results/earliest-supported-version-diagram.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Library version support with group resets" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/earliest-supported-version-mobile.png" });
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Earliest Supported Library Version");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});
