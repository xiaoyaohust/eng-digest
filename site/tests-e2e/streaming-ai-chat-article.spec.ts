import { expect, test } from "@playwright/test";

const slug = "streaming-ai-chat-platform";
const path = `/system-design/${slug}/`;
const title = "Design a Streaming AI Chat Platform";

test("AI chat design publishes in its cluster with rendered diagrams and a LinkedIn preview", async ({ page, request }) => {
  await page.goto("/system-design/");
  const cluster = page.locator(".topic-cluster").filter({
    has: page.getByRole("heading", { name: "AI Platforms & Security", exact: true }),
  });
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  expect(await page.locator(".prose .katex-display").first().evaluate(element => getComputedStyle(element).display)).toBe("block");
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(5);
  await expect(page.locator(".prose")).toContainText("A reservation timeout is a reconciliation trigger, not permission to refund.");
  await expect(page.locator(".prose")).toContainText("No first token does not prove no inference started.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/system-design/${slug}.png`,
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const image = await request.get(`/social/auto/system-design/${slug}.png`);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const bytes = await image.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    const dimensions = await diagram.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    expect(dimensions.scroll, `diagram ${index + 1} desktop width`).toBeLessThanOrEqual(dimensions.client + 1);
    await diagram.screenshot({
      path: `test-results/ai-chat-diagram-${index + 1}.png`,
      style: ".navbar { visibility: hidden !important; }",
    });
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await page.locator(".prose .mermaid-diagram").first().screenshot({
    path: "test-results/ai-chat-architecture-dark.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Streaming AI Chat Platform");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
  await page.goto("/system-design/secure-enterprise-copilot-api/");
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(0);
});

test("AI chat diagrams, tables, and formulas stay contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  const pageGeometry = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewport: innerWidth,
    math: [...document.querySelectorAll(".katex-display")].map(element => ({ client: element.clientWidth, scroll: element.scrollWidth, right: element.getBoundingClientRect().right, overflow: getComputedStyle(element).overflowX })),
    outside: [...document.querySelectorAll("body *")].filter(element => {
      if (element.closest(".mermaid-diagram, .table-scroll, pre, .katex-display, .katex-mathml")) return false;
      return element.getBoundingClientRect().right > innerWidth;
    }).slice(0, 8).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 90) })),
  }));
  expect(pageGeometry.width, JSON.stringify(pageGeometry)).toBeLessThanOrEqual(pageGeometry.viewport);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  const table = page.getByRole("region", { name: "AI chat errors and retry behavior" });
  expect(await table.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  const architecture = page.locator(".prose .mermaid-diagram").first();
  expect(await architecture.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await architecture.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => architecture.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/ai-chat-mobile.png" });
});

test("AI chat teaching material remains visible without client JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(5);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(5);
  await context.close();
});
