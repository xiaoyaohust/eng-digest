import { expect, test } from "@playwright/test";

const slug = "nat-addresses-ports-and-connection-state";
const path = `/field-notes/${slug}/`;
const title = "NAT: Addresses, Ports, and Connection State";
const topic = "Computer Networking Fundamentals";
const regions = [
  "NAT mechanisms and their state requirements",
  "TCP endpoints before and after outbound and return translation",
  "NAT failure scenarios, observations, and mitigations",
  "Architectural alternatives to shared public IPv4 NAT",
];

test("NAT note joins networking with rendered mechanisms, search, structured data, and a share image", async ({ page, request }) => {
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
  await expect(cluster).toHaveCount(1);
  const hrefs = await cluster.locator("a.article-card").evaluateAll(cards => cards.map(card => card.getAttribute("href")));
  expect(hrefs.indexOf(path)).toBeGreaterThanOrEqual(0);
  for (const previous of ["osi-tcp-ip-real-networks", "ip-addresses-in-production", "ipv4-ipv6-production-migration"]) {
    expect(hrefs.indexOf(`/field-notes/${previous}/`)).toBeGreaterThan(hrefs.indexOf(path));
  }
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/field-notes/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(3);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(2);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Further reading", exact: true }).locator("+ ul a")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const response = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    expect(await diagram.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await diagram.screenshot({ path: `test-results/nat-diagram-${index + 1}.png`, style: ".navbar { visibility: hidden !important; }" });
  }
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".prose .mermaid-dark:visible")).toHaveCount(3);
  await page.locator(".mermaid-diagram").first().screenshot({ path: "test-results/nat-diagram-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto("/tags/nat/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("NAT Addresses Ports");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("NAT diagrams, math, and tables stay contained and keyboard-scrollable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of regions) {
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
  for (const equation of await page.locator(".katex-display").all())
    expect(await equation.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  await page.goto(path);
  await page.screenshot({ path: "test-results/nat-mobile.png" });
});

test("NAT teaching material remains available without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(3);
    await expect(page.locator(".prose .katex-display")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Further reading", exact: true })).toBeVisible();
  } finally { await context.close(); }
});
