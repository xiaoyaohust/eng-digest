import { expect, test } from "@playwright/test";

const path = "/science/eclipse-atlas/stellar-clocks-phase-two/";
const title = "Eclipse Atlas, Phase Two: Validation Limits in a Python Research Pipeline";

test("phase two publishes in the same science project with evidence and an accurate status", async ({ page, request }) => {
  await page.goto("/science/");
  await expect(page.locator(".project-card")).toContainText("RESEARCH ARCHIVE");
  await expect(page.locator(".project-card")).toContainText("2 research notes");
  await page.getByRole("link", { name: /Eclipse Atlas Stellar timing with Python/ }).click();
  await expect(page.locator(".project-status")).toContainText("current analysis line is closed");
  await expect(page.locator('a[href="/science/eclipse-atlas/stellar-clocks/"]')).toBeVisible();
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose")).toContainText("no independently confirmed new companion");
  await expect(page.locator(".prose")).toContainText("No external expert has endorsed");
  await expect(page.locator(".prose img")).toHaveCount(3);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  for (const [index, figure] of (await page.locator(".prose img").all()).entries()) {
    await expect.poll(() => figure.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await figure.screenshot({ path: `test-results/science-phase-two-figure-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  const article = schemas.find((entry: { "@type": string }) => entry["@type"] === "Article");
  expect(article.headline).toBe(title);
  expect(article.inLanguage).toBe("en");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", "https://systemcraftlab.com/social/auto/science/stellar-clocks-phase-two.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get("/social/auto/science/stellar-clocks-phase-two.png");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const evidence = await request.get("/science/eclipse-atlas/phase-two-evidence.md");
  expect(evidence.ok()).toBe(true);
  expect(await evidence.text()).toContain("87f8c7d993c9b3864f5c247024e352aaa4ee993d");
  const sitemap = await request.get("/sitemap-0.xml");
  expect(await sitemap.text()).toContain(`https://systemcraftlab.com${path}`);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Corrected archival prediction power" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/science-phase-two-mobile.png" });
  await page.goto("/science/eclipse-atlas/stellar-clocks/");
  await expect(page.getByRole("link", { name: "phase-two validation report", exact: true })).toHaveAttribute("href", path);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Validation Limits");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
  // The homepage's latest-articles list rotates as new articles are published.
  await page.goto("/tags/astrophysics/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
});
