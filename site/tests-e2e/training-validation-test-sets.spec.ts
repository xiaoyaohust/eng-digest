import { expect, test } from "@playwright/test";

const path = "/ai/training-validation-and-test-sets/";
const previous = "/ai/from-a-vague-request-to-a-verifiable-task/";
const topic = "Building Good Experimental Habits";
const title = "Training, Validation, and Test Sets";

test("split lesson opens a new AI category without moving earlier lessons and publishes share assets", async ({ page, request }) => {
  await page.goto("/ai/");
  const group = page.locator(".ai-topic").filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
  await expect(group.locator(`a.article-card[href="${path}"]`)).toBeVisible();
  const earlier = page.locator(".ai-topic").filter({ has: page.getByRole("heading", { name: "From Real-World Problems to AI Tasks", exact: true }) });
  await expect(earlier.locator(`a[href="${previous}"]`)).toBeVisible();
  await expect(group.locator(`a[href="${previous}"]`)).toHaveCount(0);
  await page.getByRole("navigation", { name: "AI Foundations topics" }).getByRole("link", { name: topic, exact: false }).click();
  await expect.poll(() => group.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  await group.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(2);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const imagePath = "/social/auto/ai/training-validation-and-test-sets.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  expect(await page.locator(".mermaid-diagram").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/training-validation-test.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".mermaid-dark:visible")).toHaveCount(1);
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/training-validation-test-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
  await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  await page.goto("/tags/experimental-practice/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("new experimental practice topic and lesson remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("navigation", { name: "AI Foundations topics" }).getByRole("link", { name: topic, exact: false }).click();
  await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["Roles of training, validation, and test data", "Synthetic build data with fixed chronological partitions"]) {
    const table = page.getByRole("region", { name, exact: true });
    await table.focus();
    expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  const diagram = page.locator(".mermaid-diagram");
  expect(await diagram.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  if (await diagram.evaluate((element) => element.scrollWidth > element.clientWidth + 1)) {
    await diagram.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  for (const equation of await page.locator(".katex-display").all())
    expect(await equation.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  await page.goto(path);
  await page.screenshot({ path: "test-results/training-validation-test-mobile.png" });
});

test("split lesson and its category navigation render without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator(".katex-display")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
    await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  } finally { await context.close(); }
});
