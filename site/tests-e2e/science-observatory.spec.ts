import { expect, test } from "@playwright/test";

const articlePath = "/science/eclipse-atlas/stellar-clocks/";
const title = "Eclipse Atlas: Engineering a Python Pipeline for Stellar Timing";

test("scientific computing navigation opens the project and its English research article", async ({ page, request }) => {
  await page.goto("/");
  await page.locator(".navbar .nav-links").getByRole("link", { name: "Computing for Science", exact: true }).click();
  await expect(page).toHaveURL(/\/science\/$/);
  await page.getByRole("link", { name: /Eclipse Atlas Stellar timing with Python/ }).click();
  await expect(page).toHaveURL(/\/science\/eclipse-atlas\/$/);
  await page.locator(`a[href="${articlePath}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page.locator(".prose")).toContainText("no independently confirmed new astronomical discovery");
  await expect(page.locator(".prose")).toContainText("about 23%");
  await expect(page.locator(".prose img")).toHaveCount(3);
  expect(await page.locator(".prose").textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "Eclipse Atlas", exact: true })).toHaveAttribute("href", "/science/eclipse-atlas/");
  await expect(page.locator("[data-article-actions]")).toHaveAttribute("data-summary", /#Astrophysics #ScientificComputing #OpenScience/);
  for (const image of await page.locator(".prose img").all()) {
    expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((entry: { "@type": string }) => entry["@type"] === "Article").inLanguage).toBe("en");
  const breadcrumb = schemas.find((entry: { "@type": string }) => entry["@type"] === "BreadcrumbList");
  expect(breadcrumb.itemListElement.map((entry: { name: string }) => entry.name)).toEqual(["Home", "Computing for Science", "Eclipse Atlas", title]);
  const imagePath = "/social/auto/science/stellar-clocks.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  const preview = await request.get(imagePath);
  expect(preview.ok()).toBe(true);
  const png = await preview.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const evidence = await request.get("/science/eclipse-atlas/evidence.md");
  expect(evidence.ok()).toBe(true);
  expect(await evidence.text()).toContain("4d2cd05a4aff012960ba1ebf9d6d5aa28c3d5c72");
  const sitemap = await request.get("/sitemap-0.xml");
  expect(await sitemap.text()).toContain(`https://systemcraftlab.com${articlePath}`);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('label[for="nav-toggle"]').click();
  await expect(page.locator('.navbar a[aria-label="Search the knowledge base"]')).toHaveAttribute("href", "/search/");
  await expect(page.locator('.navbar .nav-links a[href="/science/"]')).toBeVisible();
  await page.screenshot({ path: "test-results/science-article-mobile.png", fullPage: true });
});

test("English search finds the science article and existing engineering content", async ({ page }) => {
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Eclipse Atlas");
  await expect(page.locator(`.pagefind-ui__result-link[href="${articlePath}"]`)).toBeVisible();
  await page.locator(".pagefind-ui__search-input").fill("sandbox");
  await expect(page.locator('.pagefind-ui__result-link[href="/system-design/cloud-sandbox-platform/"]')).toBeVisible();
});

test("science entry is linked from the homepage and its tags without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(`a[href="${articlePath}"]`).first()).toBeVisible();
  await page.goto("/tags/astrophysics/");
  await expect(page.locator(`a[href="${articlePath}"]`)).toBeVisible();
  for (const path of ["/science/", "/science/eclipse-atlas/", "/"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/science/");
  await page.screenshot({ path: "test-results/science-observatory-desktop.png", fullPage: true });
});
