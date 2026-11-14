import { expect, test } from "@playwright/test";

const slug = "tcp-three-way-handshake";
const path = `/field-notes/${slug}/`;
const title = "TCP’s Three-Way Handshake: State, Latency, and Failure";

test("TCP handshake note joins networking with static figures, math, search, and a share image", async ({ page, request }) => {
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: "Computer Networking Fundamentals", exact: true }),
  });
  const hrefs = await cluster.locator("a.article-card").evaluateAll(cards => cards.map(card => card.getAttribute("href")));
  expect(hrefs.indexOf(path)).toBeGreaterThanOrEqual(0);
  expect(hrefs.indexOf("/field-notes/tcp-reliable-bytes-congestion-and-failure/")).toBeGreaterThan(hrefs.indexOf(path));
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/TCP[’']s Three-Way Handshake: State, Latency, and Failure/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(4);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .katex-display")).toHaveCount(3);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(3);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator('head link[rel="stylesheet"][href*="/vendor/katex/"]')).toHaveCount(1);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Further reading", exact: true }).locator("+ ul a")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const imagePath = `/social/auto/field-notes/${slug}.png`;
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(imagePath);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const image = await response.body();
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(627);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline.replaceAll("'", "’")).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Figure ${index + 1}`).toBe(true);
    expect(await diagram.evaluate(element => element.getBoundingClientRect().height), `Figure ${index + 1} height`).toBeLessThan(1000);
    await diagram.screenshot({ path: `test-results/tcp-handshake-figure-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(4);
  await page.locator(".mermaid-diagram").first().screenshot({ path: "test-results/tcp-handshake-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto("/tags/tcp/");
  await expect(page.locator(`a.article-card[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Three-Way Handshake");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("TCP handshake figures, tables, and formulas stay usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["Linux connection establishment controls and their scope", "TCP establishment failures, evidence, and mitigations", "Connection setup strategies and their trade-offs"]) {
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
  for (const equation of await page.locator(".katex-display").all())
    expect(await equation.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  await page.goto(path);
  await page.screenshot({ path: "test-results/tcp-handshake-mobile.png" });
});

test("TCP handshake teaching remains available without browser JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/TCP[’']s Three-Way Handshake: State, Latency, and Failure/);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(4);
    await expect(page.locator(".prose .katex-display")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "A working model", exact: true })).toBeVisible();
    await expect(page.locator(".prose")).toContainText("A pure ACK has no independent retransmission timer.");
  } finally { await context.close(); }
});
