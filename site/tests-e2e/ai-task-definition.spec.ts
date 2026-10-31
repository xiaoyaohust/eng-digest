import { expect, test } from "@playwright/test";

const path = "/ai/defining-goals-inputs-outputs-and-constraints/";
const previous = "/ai/cpu-gpu-memory-and-compute-costs/";
const topic = "From Real-World Problems to AI Tasks";
const title = "Defining Goals, Inputs, Outputs, and Constraints";
const regionNames = [
  "Specification for the hypothetical delivery alert task",
  "Synthetic deliveries with reference outcomes and proposed alerts",
  "Error cost and feasibility of four illustrative dispatch policies",
];

test("AI categories group existing lessons, preserve reading order, and provide working topic links", async ({ page }) => {
  await page.goto("/ai/");
  const groups = page.locator(".ai-topic");
  const names = await groups.locator(":scope > h3").allTextContents();
  expect(names.indexOf(topic)).toBeLessThan(names.indexOf("Introduction to AI"));
  const newGroup = groups.filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
  await expect(newGroup.locator(`a[href="${path}"]`)).toBeVisible();
  const oldGroup = groups.filter({ has: page.getByRole("heading", { name: "Introduction to AI", exact: true }) });
  for (const slug of ["from-rules-to-machine-learning", "ai-machine-learning-deep-learning",
    "discriminative-and-generative-models", "large-language-models-and-agents",
    "training-inference-and-deployment", "ai-capabilities-and-limits", "cpu-gpu-memory-and-compute-costs"]) {
    await expect(oldGroup.locator(`a[href="/ai/${slug}/"]`)).toBeVisible();
  }
  await page.getByRole("navigation", { name: "AI Foundations topics" }).getByRole("link", { name: "Introduction to AI", exact: false }).click();
  await expect.poll(() => oldGroup.locator(":scope > h3").evaluate((element) => element.matches(":target"))).toBe(true);
  await page.getByRole("link", { name: /Start reading/ }).click();
  await expect(page).toHaveURL(/\/ai\/from-rules-to-machine-learning\/$/);
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
  await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  await page.screenshot({ path: "test-results/ai-categories-desktop.png", fullPage: true });
});

test("task definition publishes its worked example, static visuals, and social preview", async ({ page, request }) => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".prose .katex-display")).toHaveCount(2);
  await expect(page.locator(".prose .katex-mathml math")).toHaveCount(2);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(3);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator("[data-copy-value]")).toHaveAttribute("data-copy-value", `https://systemcraftlab.com${path}`);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  const imagePath = "/social/auto/ai/defining-goals-inputs-outputs-and-constraints.png";
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
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/ai-task-flow.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".mermaid-dark:visible")).toHaveCount(1);
  await page.locator(".mermaid-diagram").screenshot({ path: "test-results/ai-task-flow-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto("/tags/problem-framing/");
  await expect(page.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill(title);
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("AI category navigation and the task lesson remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("navigation", { name: "AI Foundations topics" }).getByRole("link", { name: topic, exact: false }).click();
  await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate((element) => element.matches(":target"))).toBe(true);
  await page.screenshot({ path: "test-results/ai-categories-mobile.png" });
  await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of regionNames) {
    const table = page.getByRole("region", { name, exact: true });
    await table.focus();
    expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  const diagram = page.locator(".mermaid-diagram");
  expect(await diagram.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  for (const equation of await page.locator(".katex-display").all()) {
    expect(await equation.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  }
  await page.goto(path);
  await page.screenshot({ path: "test-results/ai-task-mobile.png" });
});

test("task lesson and category links work without JavaScript", async ({ browser, baseURL }) => {
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
