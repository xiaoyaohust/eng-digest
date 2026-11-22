import { expect, test } from "@playwright/test";

const path = "/personal/china-history/stratigraphy-dating-and-past-environments/";
const chinesePath = `/zh${path}`;
const en = "Layers, Dates, and Past Environments: Reading the Evidence for Prehistoric China";
const zh = "土层、年代与环境：怎样读懂史前中国留下的证据";
const site = "https://systemcraftlab.com";

test("a crawler without JavaScript receives separate Chinese and English metadata and readable content", async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const baseURL = test.info().project.use.baseURL!;
  try {
    for (const [route, title, locale, language, image] of [
      [path, en, "en_US", "en", "/social/auto/personal/stratigraphy-dating-and-past-environments.png"],
      [chinesePath, zh, "zh_CN", "zh-CN", "/social/auto/personal/stratigraphy-dating-and-past-environments.zh-CN.png"],
    ]) {
      await page.goto(`${baseURL}${route}`);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      // Fallback crawlers may read the first heading instead of Open Graph.
      await expect(page.locator(".article-header h1").first()).toHaveText(title);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${title} · Eng Knowledge`);
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${site}${route}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site}${route}`);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${site}${image}`);
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", `${site}${image}`);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", `${site}${path}`);
      await expect(page.locator('link[hreflang="zh-CN"]')).toHaveAttribute("href", `${site}${chinesePath}`);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(/[\u3400-\u9fff]/.test(description!)).toBe(language === "zh-CN");
      const schemas = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
      expect(schemas.find((item: { "@type": string }) => item["@type"] === "Article").inLanguage).toBe(language);
      const response = await request.get(image); expect(response.ok()).toBe(true);
      const png = await response.body(); expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 627]);
      await expect(page.locator(".prose figure img:visible")).toHaveCount(4);
      await expect(page.locator(".prose figure img").first()).toHaveAttribute("src", new RegExp(`sequence-${language === "zh-CN" ? "zh" : "en"}\\.svg$`));
    }
  } finally { await context.close(); }
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain(`${site}${chinesePath}`);
  expect((await request.get("/zh/ai/from-rules-to-machine-learning/")).status()).toBe(404);
});

test("switching languages changes the browser URL, share destination, copied text, and reload result", async ({ page }) => {
  await page.goto(`${path}?lang=en&utm_source=sharing-test`);
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "CN", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${chinesePath}\\?utm_source=sharing-test$`));
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `${site}${chinesePath}`);
  await expect(page.locator('[data-share-linkedin]')).toHaveAttribute("href", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(site + chinesePath)}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${zh} · Eng Knowledge`);
  await page.getByRole("button", { name: "复制中文链接", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${site}${chinesePath}`);
  await page.getByRole("button", { name: "复制中文分享摘要", exact: true }).click();
  const summary = await page.evaluate(() => navigator.clipboard.readText());
  expect(summary).toContain(zh); expect(summary).toContain(`${site}${chinesePath}`); expect(summary).not.toContain(en);
  await page.reload(); await expect(page.getByRole("heading", { level: 1 })).toHaveText(zh);
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}\\?utm_source=sharing-test$`));
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `${site}${path}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${en} · Eng Knowledge`);
});

test("legacy query links normalize to a shareable static URL and a direct Chinese URL overrides stored English", async ({ page }) => {
  await page.goto(`${path}?lang=zh`);
  await expect(page).toHaveURL(new RegExp(`${chinesePath}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zh);
  await page.evaluate(() => localStorage.setItem("article-lang", "en"));
  await page.goto(chinesePath);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(zh);
  await page.goto(`${chinesePath}?lang=en`);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en);
});
