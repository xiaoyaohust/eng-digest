import { expect, test } from "@playwright/test";

const path = "/system-design/ci-build-platform/";
const title = "Design a CI Build Platform";
const topic = "Infrastructure & Developer Platforms";

test("CI design joins developer platforms with five rendered figures and a LinkedIn image", async ({ page, request }) => {
  await page.goto("/system-design/");
  await expect(page.locator(".topic-cluster > header h2").first()).toHaveText(topic);
  const cluster = page.locator(".topic-cluster").filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
  await expect(cluster.locator("a.article-card").first()).toHaveAttribute("href", path);
  await cluster.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/system-design/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(4);
  await expect(page.locator('.prose pre[data-language="yaml"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="json"]')).toHaveCount(1);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(10);
  await expect(page.locator(".prose")).toContainText("A lease expiry does not prove that the old process stopped.");
  await expect(page.locator(".prose")).toContainText("ListParts cannot reconstruct the missing bytes after a runner host is lost.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const imagePath = "/social/auto/system-design/ci-build-platform.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    await diagram.screenshot({ path: `test-results/ci-figure-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
    expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Figure ${index + 1}`).toBe(true);
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(5);
  await page.locator(".mermaid-diagram").first().screenshot({ path: "test-results/ci-architecture-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("CI Build Platform");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("CI figures and tables stay usable on a phone without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["Build caches, execution images, and artifacts", "Illustrative CI capacity and storage estimates", "CI metadata records and authoritative keys", "CI platform failures and recovery behavior"]) {
    const region = page.getByRole("region", { name, exact: true });
    expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  }
  for (const diagram of await page.locator(".mermaid-diagram").all()) {
    expect(await diagram.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    if (await diagram.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
      await diagram.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => diagram.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
  }
  await page.goto(path);
  await page.screenshot({ path: "test-results/ci-mobile.png" });
});

test("CI design diagrams and protocol remain readable without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
    await expect(page.locator(".prose .table-scroll table")).toHaveCount(4);
    await expect(page.locator(".prose")).toContainText(/HEAD plus a valid checksum does not authorize publishing a stale attempt[’']s output\./);
  } finally { await context.close(); }
});
