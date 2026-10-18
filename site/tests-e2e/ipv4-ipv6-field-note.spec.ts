import { expect, test } from "@playwright/test";

const slug = "ipv4-ipv6-production-migration";
const path = `/field-notes/${slug}/`;
const title = "IPv4 and IPv6: Packets, Paths, and Production Migration";
const topic = "Computer Networking Fundamentals";

test("IPv4 and IPv6 article joins the networking series with diagrams and sharing metadata", async ({ page, request }) => {
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: topic, exact: true }),
  });
  await expect(cluster).toHaveCount(1);
  for (const previous of ["osi-tcp-ip-real-networks", "ip-addresses-in-production"]) {
    await expect(cluster.locator(`a[href="/field-notes/${previous}/"]`)).toBeVisible();
  }
  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.locator(".prose")).toContainText("Internet-Draft, work in progress");
  await expect(page.locator(".prose")).toContainText("IPv6 does not encrypt application traffic automatically.");
  await expect(page.locator('.prose a[href="/field-notes/ip-addresses-in-production/"]')).toBeVisible();
  const reading = page.getByRole("heading", { name: "Further reading", exact: true });
  await expect(reading.locator("+ ul a")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const image = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  const sitemap = await request.get("/sitemap-0.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`https://systemcraftlab.com${path}`);
  for (const [index, diagram] of (await page.locator(".prose .mermaid-diagram").all()).entries()) {
    expect(await diagram.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await diagram.screenshot({
      path: `test-results/ipv4-ipv6-diagram-${index + 1}.png`,
      style: ".navbar { visibility: hidden !important; }",
    });
  }
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Production Migration");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("IPv4 and IPv6 article stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "IPv4 and IPv6 packet comparison" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const diagram = page.locator(".prose .mermaid-diagram").first();
  expect(await diagram.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.goto(path);
  await page.screenshot({ path: "test-results/ipv4-ipv6-mobile.png" });
});
