import { expect, test } from "@playwright/test";

const path = "/ai/experiment-records-version-control-and-reproduction/";
const previous = "/ai/randomness-repeated-experiments-and-variation/";
const title = "Experiment Records, Version Control, and Reproduction";
const chineseTitle = "实验记录、版本管理与复现";
const topic = "Building Good Experimental Habits";

test("experiment records lesson joins the latest AI topic with reading links, search, and share metadata", async ({ page, request }) => {
  await page.goto("/ai/");
  const group = page.locator(".ai-topic").filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
  const paths = await group.locator("a.article-card").evaluateAll(cards => cards.map(card => card.getAttribute("href")));
  expect(paths.indexOf(path)).toBeGreaterThanOrEqual(0);
  expect(paths.indexOf(previous)).toBeGreaterThan(paths.indexOf(path));
  await group.locator(`a.article-card[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .katex-display:visible")).toHaveCount(1);
  await expect(page.locator(".prose .katex-mathml math:visible")).toHaveCount(1);
  await expect(page.locator(".prose .katex-error")).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll:visible table")).toHaveCount(2);
  await expect(page.locator('.prose pre[data-language="python"]:visible')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="text"]:visible')).toContainText("changed data rejected: True");
  await expect(page.getByRole("heading", { name: "References consulted", exact: true }).locator("+ ul a")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Answer guidance", exact: true })).toBeVisible();
  await expect(page.locator(".prev-next-link").first()).toHaveAttribute("href", previous);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  const imagePath = "/social/auto/ai/experiment-records-version-control-and-reproduction.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `https://systemcraftlab.com${imagePath}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const image = await request.get(imagePath);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 627]);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  expect(schemas.find((schema: { "@type": string }) => schema["@type"] === "Article").headline).toBe(title);
  expect(await (await request.get("/sitemap-0.xml")).text()).toContain(`https://systemcraftlab.com${path}`);
  await page.goto(previous);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(new RegExp(path));
  await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
  await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate(element => element.matches(":target"))).toBe(true);
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Experiment Records Version Control Reproduction");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});

test("experiment records English and Chinese keep aligned teaching content and remember the language", async ({ page }) => {
  await page.goto(path);
  const primary = page.locator('.prose [data-lang-pane="primary"]');
  const alternate = page.locator('.prose [data-lang-pane="alt"]');
  const structure = (element: Element) => [...element.querySelectorAll("h2, pre, .mermaid-diagram, .table-scroll, .katex-display")]
    .map(node => node.matches("h2") ? "heading" : node.matches(".mermaid-diagram") ? "figure" : node.matches(".table-scroll") ? "table" : node.matches(".katex-display") ? "equation" : "code");
  expect(await alternate.evaluate(structure)).toEqual(await primary.evaluate(structure));
  const englishDiagram = primary.locator(".mermaid-diagram");
  expect(await englishDiagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1000);
  await englishDiagram.screenshot({ path: "test-results/records-en-diagram.png", style: ".navbar { visibility: hidden !important; }" });
  await page.locator("[data-lang-toggle]").first().getByRole("button", { name: "CN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(primary).toBeHidden();
  await expect(alternate).toBeVisible();
  await expect(alternate.locator(".mermaid-diagram svg:visible")).toHaveCount(1);
  await expect(alternate.locator(".katex-display:visible")).toHaveCount(1);
  await expect(alternate.locator('.katex-mathml math')).toHaveCount(1);
  await page.locator(".article-toc").getByRole("link", { name: "完成一个完整的合成示例", exact: true }).click();
  await expect(page.getByRole("heading", { name: "完成一个完整的合成示例", exact: true })).toBeInViewport();
  const chineseDiagram = alternate.locator(".mermaid-diagram");
  expect(await chineseDiagram.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(1000);
  await chineseDiagram.screenshot({ path: "test-results/records-cn-diagram.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(alternate.locator(".mermaid-dark:visible")).toHaveCount(1);
  await chineseDiagram.screenshot({ path: "test-results/records-cn-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
  await page.locator("[data-lang-toggle]").last().getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.goto(`${path}?lang=zh`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chineseTitle);
});

test("both experiment records versions fit a phone with scrollable tables and equations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ["en", "zh"]) {
    await page.goto(`${path}?lang=${lang}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lang === "en" ? title : chineseTitle);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const region of await page.locator(".prose .table-scroll:visible").all()) {
      expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await region.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    const equation = page.locator(".prose .katex-display:visible");
    expect(await equation.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    const diagram = page.locator(".prose .mermaid-diagram:visible");
    expect(await diagram.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    if (await diagram.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
      await diagram.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => diagram.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.goto(`${path}?lang=${lang}`);
    await page.screenshot({ path: `test-results/records-mobile-${lang}.png` });
  }
});

test("experiment records English teaching and static math remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("[data-lang-toggle]:visible")).toHaveCount(0);
    await expect(page.locator(".prose .mermaid-diagram svg:visible")).toHaveCount(1);
    await expect(page.locator(".prose .katex-display:visible")).toHaveCount(1);
    await expect(page.locator('.prose pre[data-language="python"]:visible')).toHaveCount(1);
    await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: topic, exact: true }).click();
    await expect.poll(() => page.getByRole("heading", { name: topic, exact: true }).evaluate(element => element.matches(":target"))).toBe(true);
  } finally { await context.close(); }
});
