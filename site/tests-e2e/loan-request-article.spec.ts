import { expect, test } from "@playwright/test";

const slug = "loan-requests-company-hierarchy-matching";
const path = `/coding/${slug}/`;
const title = "Match Loan Requests Across a Company Hierarchy";

test("loan matching article publishes in Coding with executable solutions and share metadata", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  for (const name of ["Problem", "Java solution", "Python solution", "Expected output", "Complexity"])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const card = await request.get(`/social/auto/coding/${slug}.png`);
  expect(card.ok()).toBe(true);
  expect(card.headers()["content-type"]).toContain("image/png");
  const png = await card.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  const diagram = page.locator(".prose .mermaid-diagram");
  expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await diagram.screenshot({ path: "test-results/loan-request-diagram.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".mermaid-dark:visible")).toHaveCount(1);
  await page.goto("/tags/request-matching/");
  await expect(page.locator(`a.article-card[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("loan matching explanation, code, and tables work on mobile without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["Loans and their normalized matching keys", "Hierarchy preprocessing and request matching complexity"]) {
      const table = page.getByRole("region", { name, exact: true });
      expect(await table.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await table.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.goto(path);
    await page.screenshot({ path: "test-results/loan-request-mobile.png" });
  } finally { await context.close(); }
});
