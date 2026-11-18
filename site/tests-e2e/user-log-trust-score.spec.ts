import { expect, test } from "@playwright/test";

const path = "/coding/user-log-qualification-and-purchase-trust-scores/";
const enTitle = "User Log Qualification and Purchase Trust Scores";
const zhTitle = "用户日志筛选与新交易信任评分";

test("purchase scoring is discoverable in Coding with English metadata, share image, and search", async ({ page, request }) => {
  await page.goto("/coding/");
  await expect(page.locator(`a.article-card[href="${path}"]`)).toBeVisible();
  await page.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const primary = page.locator('.prose [data-lang-pane="primary"]');
  await expect(primary.locator('pre[data-language="java"]')).toHaveCount(1);
  await expect(primary.locator('pre[data-language="python"]')).toHaveCount(1);
  await expect(primary.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(primary.getByRole("region").locator("table")).toBeVisible();
  await expect(primary.getByRole("heading", { name: "Expected output", exact: true }).locator("+ p + pre")).toContainText("large next: 80");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  const imagePath = "/social/auto/coding/user-log-qualification-and-purchase-trust-scores.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 627]);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(enTitle);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("purchase scoring languages keep the same code and figure placement with working language memory", async ({ page }) => {
  await page.goto(path);
  const primary = page.locator('.prose [data-lang-pane="primary"]');
  const alternate = page.locator('.prose [data-lang-pane="alt"]');
  const outline = (element: Element) => [...element.querySelectorAll("h2, pre, .table-scroll, .mermaid-diagram")].map(node => node.matches("h2") ? "heading" : node.matches(".table-scroll") ? "table" : node.matches(".mermaid-diagram") ? "diagram" : "code");
  expect(await primary.evaluate(outline)).toEqual(await alternate.evaluate(outline));
  for (const language of ["java", "python"]) {
    expect(await primary.locator(`pre[data-language="${language}"]`).textContent()).toEqual(await alternate.locator(`pre[data-language="${language}"]`).textContent());
  }
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "CN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(primary).toBeHidden();
  await expect(alternate.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
  await page.locator(".article-toc").getByRole("link", { name: "时间与空间复杂度", exact: true }).click();
  await expect(page.getByRole("heading", { name: "时间与空间复杂度", exact: true })).toBeInViewport();
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
  await page.locator("[data-lang-toggle]").last().getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await page.goto(`${path}?lang=zh`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
});

test("purchase scoring tables and code fit a phone in either language", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const language of ["en", "zh"]) {
    await page.goto(`${path}?lang=${language}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const pane = page.locator(`.prose [data-lang-pane="${language === "en" ? "primary" : "alt"}"]`);
    const table = pane.locator(".table-scroll");
    await table.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    const diagram = pane.locator(".mermaid-diagram");
    expect(await diagram.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    await diagram.screenshot({ path: `test-results/purchase-scoring-${language}-diagram.png`, style: ".navbar { visibility: hidden !important; }" });
    if (await pane.locator(".mermaid-dark:visible").count() === 0) {
      await page.getByRole("button", { name: "Toggle color theme" }).click();
    }
    await expect(pane.locator(".mermaid-dark:visible")).toHaveCount(1);
  }
});

test("purchase scoring English solutions and diagram are readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
    await expect(page.locator('.prose pre[data-language="java"]:visible')).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="python"]:visible')).toHaveCount(1);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator("[data-lang-toggle]:visible")).toHaveCount(0);
  } finally { await context.close(); }
});
