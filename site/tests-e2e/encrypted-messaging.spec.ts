import { expect, test } from "@playwright/test";

const path = "/system-design/end-to-end-encrypted-messaging/";
const title = "Design an End-to-End Encrypted Messaging Platform";
const chineseTitle = "设计端到端加密聊天平台";

test("encrypted messaging publishes in Real-Time Systems with a LinkedIn image and both languages", async ({ page, request }) => {
  await page.goto("/system-design/");
  const cluster = page.locator(".topic-cluster").first();
  await expect(cluster.getByRole("heading", { level: 2 })).toHaveText("Real-Time Systems");
  await expect(cluster.locator("a.article-card").first()).toHaveAttribute("href", path);
  await cluster.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("[data-lang-toggle]")).toHaveCount(2);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await expect(page.locator(".prose .table-scroll:visible table")).toHaveCount(5);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(7);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const imagePath = "/social/auto/system-design/end-to-end-encrypted-messaging.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 627]);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(0);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Encrypted Messaging Platform");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("EN and CN retain figure placement, switch both TOCs, and remember the reading language", async ({ page }) => {
  await page.goto(path);
  const layout = async (pane: string) => page.locator(`.prose [data-lang-pane="${pane}"]`).evaluate(element =>
    [...element.querySelectorAll("h2, .mermaid-diagram, .table-scroll, pre")]
      .map(node => node.matches("h2") ? "heading" : node.matches(".mermaid-diagram") ? "figure" : node.matches(".table-scroll") ? "table" : "code"));
  expect(await layout("alt")).toEqual(await layout("primary"));
  for (const [index, diagram] of (await page.locator('.prose [data-lang-pane="primary"] .mermaid-diagram').all()).entries()) {
    expect(await diagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1500);
    await diagram.screenshot({ path: `test-results/messaging-en-figure-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "CN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page).toHaveURL(/[?&]lang=zh\b/);
  await expect(page.locator('.prose [data-lang-pane="primary"]')).toBeHidden();
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await expect(page.locator(".article-toc").getByRole("link", { name: "3. 总体架构", exact: true })).toBeVisible();
  await page.locator(".article-toc").getByRole("link", { name: "3. 总体架构", exact: true }).click();
  await expect(page.getByRole("heading", { name: "3. 总体架构", exact: true })).toBeInViewport();
  for (const [index, diagram] of (await page.locator('.prose [data-lang-pane="alt"] .mermaid-diagram').all()).entries()) {
    expect(await diagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1500);
    await diagram.screenshot({ path: `test-results/messaging-cn-figure-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(5);
  await page.locator('.prose [data-lang-pane="alt"] .mermaid-diagram').first().screenshot({ path: "test-results/messaging-cn-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
  await page.locator("[data-lang-toggle]").last().getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto(`${path}?lang=zh`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
});

test("both language versions keep figures and tables usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ["en", "zh"]) {
    await page.goto(`${path}?lang=${lang}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lang === "en" ? title : chineseTitle);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const region of await page.locator(".prose .table-scroll:visible").all()) {
      if (await region.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
        await region.focus();
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      }
    }
    for (const diagram of await page.locator(".prose .mermaid-diagram:visible").all()) {
      expect(await diagram.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
      if (await diagram.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
        await diagram.focus();
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => diagram.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      }
    }
    await page.goto(`${path}?lang=${lang}`);
    await page.screenshot({ path: `test-results/messaging-mobile-${lang}.png` });
  }
});

test("English and its five static diagrams remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("[data-lang-toggle]:visible")).toHaveCount(0);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
    await expect(page.locator(".prose .table-scroll:visible table")).toHaveCount(5);
    await expect(page.locator('.prose [data-lang-pane="primary"]')).toContainText("SYNC_RANGE_EXPIRED");
  } finally { await context.close(); }
});
