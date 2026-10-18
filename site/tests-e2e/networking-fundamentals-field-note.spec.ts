import { expect, test } from "@playwright/test";

const slug = "osi-tcp-ip-real-networks";
const path = `/field-notes/${slug}/`;
const title = "OSI and TCP/IP: How Real Networks Work";
const topic = "Computer Networking Fundamentals";

test("networking Field Note creates a manual category and publishes diagrams and a share card", async ({ page, request }) => {
  await page.goto("/field-notes/");
  const cluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: topic, exact: true }),
  });
  const clusterId = await cluster.getAttribute("id");
  await expect(page.getByRole("navigation", { name: "Engineering Field Notes topics" })
    .getByRole("link", { name: new RegExp(topic) })).toHaveAttribute("href", `#${clusterId}`);
  await expect(cluster.locator(`a[href="${path}"]`)).toBeVisible();
  const originalCluster = page.locator(".field-topic-cluster").filter({
    has: page.getByRole("heading", { name: "System Design Fundamentals", exact: true }),
  });
  await expect(originalCluster.locator('a[href="/field-notes/stateless-vs-stateful/"]')).toBeVisible();
  await expect(originalCluster.locator(`a[href="${path}"]`)).toHaveCount(0);

  await cluster.locator(`a[href="${path}"]`).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll")).toHaveCount(3);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  const reading = page.getByRole("heading", { name: "Further reading", exact: true });
  await expect(reading).toBeVisible();
  await expect(reading.locator("+ ul a")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const response = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);

  for (let index = 0; index < 3; index++) {
    await page.locator(".prose .mermaid-diagram").nth(index).screenshot({
      path: `test-results/networking-diagram-${index + 1}.png`,
      style: ".navbar { visibility: hidden !important; }",
    });
  }
  // The homepage rotates its latest six articles as new notes are published.
  // Historical networking notes remain discoverable through their tag archive.
  await page.goto("/tags/networking/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("How Real Networks Work");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("networking article and category remain usable on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/field-notes/");
  await expect(page.getByRole("heading", { name: topic, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto(path);
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "OSI and TCP IP responsibility mapping" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const diagram = page.locator(".prose .mermaid-diagram").first();
  expect(await diagram.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await diagram.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => diagram.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
