import { expect, test } from "@playwright/test";

const slug = "ports-sockets-connections-and-capacity";
const path = `/field-notes/${slug}/`;
const title = "Ports: Sockets, Connections, and Capacity";

test("ports note joins networking with rendered diagrams, math, and a LinkedIn preview", async ({ page, request }) => {
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: "Computer Networking Fundamentals", exact: true }),
  });
  const hrefs = await cluster.locator("a.article-card").evaluateAll(cards => cards.map(card => card.getAttribute("href")));
  expect(hrefs.indexOf(path)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf("/field-notes/nat-addresses-ports-and-connection-state/")).toBeGreaterThan(hrefs.indexOf(path));
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(3);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  expect(await page.locator(".katex-display").first().evaluate(element => getComputedStyle(element).display)).toBe("block");
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Further reading", exact: true }).locator("+ ul a")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const image = await response.body();
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await diagram.screenshot({ path: `test-results/ports-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(3);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Ports Sockets Connections Capacity");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
  // The same renderer now supplies math styles for existing Field Notes, too.
  await page.goto("/field-notes/nat-addresses-ports-and-connection-state/");
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  await page.goto("/field-notes/ip-addresses-in-production/");
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(0);
});

test("ports diagrams, equations, and tables fit a mobile page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["TCP connections sharing a listening port", "Port and socket failure scenarios", "Architectural choices for port sharing and connection capacity"]) {
    const table = page.getByRole("region", { name, exact: true });
    expect(await table.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await table.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
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
  await page.screenshot({ path: "test-results/ports-mobile.png" });
});

test("ports teaching material remains readable without client JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(3);
    await expect(page.locator(".prose .katex-display")).toHaveCount(2);
    await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  } finally { await context.close(); }
});
