import { expect, test } from "@playwright/test";

const path = "/personal/china-history/prehistory-sites-and-archaeological-evidence/";
const topic = "第一章 史前中国的自然环境与考古学证据";
const zhTitle = "从仰韶到良渚：中国史前史怎样被重建";
const enTitle = "From Yangshao to Liangzhu: Reconstructing Prehistoric China";

test("Chinese history chapter is discoverable and publishes a valid share image and canonical URL", async ({ page, request }) => {
  await page.goto("/personal/");
  await page.locator('.column-card[href="/personal/china-history/"]').click();
  await expect(page.getByRole("heading", { name: topic, exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Article chapters" }).getByRole("link").click();
  await expect.poll(() => page.locator(".personal-topic").evaluate(element => element.matches(":target"))).toBe(true);
  await page.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const imagePath = "/social/auto/personal/prehistory-sites-and-archaeological-evidence.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  const png = await image.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 627]);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(zhTitle);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
  await expect.poll(() => page.locator(".personal-topic").evaluate(element => element.matches(":target"))).toBe(true);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("仰韶");
  await expect(page.locator(`.pagefind-ui__result-link[href$="${path}"]`)).toBeVisible();
});

test("Chinese primary and English alternate keep aligned figures and remember either language", async ({ page }) => {
  await page.goto(path);
  const primary = page.locator('.prose [data-lang-pane="primary"]');
  const alternate = page.locator('.prose [data-lang-pane="alt"]');
  const outline = (element: Element) => [...element.querySelectorAll("h2, figure, .mermaid-diagram")].map(node => node.matches("h2") ? "heading" : node.matches("figure") ? "illustration" : "diagram");
  expect(await primary.evaluate(outline)).toEqual(await alternate.evaluate(outline));
  await expect(primary.locator(".mermaid-diagram svg:visible")).toHaveCount(2);
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(primary).toBeHidden();
  await expect(alternate).toBeVisible();
  await expect(alternate.locator(".mermaid-diagram svg:visible")).toHaveCount(2);
  await page.locator(".article-toc").getByRole("link", { name: "How the layers at Hougang established a sequence", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How the layers at Hougang established a sequence", exact: true })).toBeInViewport();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await page.locator("[data-lang-toggle]").last().getByRole("button", { name: "CN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
  await page.goto(`${path}?lang=en`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
  await page.goto(`${path}?lang=zh`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(primary.locator(".mermaid-dark:visible")).toHaveCount(2);
});

test("history figures load without overflow on a phone in both languages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ["zh", "en"]) {
    await page.goto(`${path}?lang=${lang}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const pane = page.locator(`.prose [data-lang-pane="${lang === "zh" ? "primary" : "alt"}"]`);
    for (const [index, image] of (await pane.locator("figure img").all()).entries()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 1536)).toBe(true);
      await expect(image).toHaveAttribute("width", "1536");
      await expect(image).toHaveAttribute("height", "1024");
      expect(await image.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
      await image.locator("..").screenshot({ path: `test-results/prehistory-${lang}-illustration-${index}.png`, style: ".navbar { visibility: hidden !important; }" });
    }
    for (const [index, diagram] of (await pane.locator(".mermaid-diagram").all()).entries()) {
      expect(await diagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1200);
      await diagram.screenshot({ path: `test-results/prehistory-${lang}-diagram-${index}.png`, style: ".navbar { visibility: hidden !important; }" });
    }
  }
  await page.goto("/personal/china-history/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Chinese history text and static diagrams remain readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(zhTitle);
    await expect(page.locator("[data-lang-toggle]:visible")).toHaveCount(0);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(2);
    await expect(page.locator(".prose figure img:visible")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "发现与研究时间线", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
    await expect.poll(() => page.locator(".personal-topic").evaluate(element => element.matches(":target"))).toBe(true);
  } finally { await context.close(); }
});
