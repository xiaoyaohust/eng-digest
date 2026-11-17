import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const contentRoot = path.join(process.cwd(), "src", "content");
const translationRoot = path.join(contentRoot, "translations");

function markdownFiles(directory: string): string[] {
  try {
    return readdirSync(directory).flatMap((name) => {
      const location = path.join(directory, name);
      if (statSync(location).isDirectory()) return markdownFiles(location);
      return /\.mdx?$/.test(name) ? [location] : [];
    });
  } catch {
    return [];
  }
}

function frontmatterField(file: string, field: string): string | undefined {
  const block = readFileSync(file, "utf8").match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
  return block.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1].trim();
}

/** URL of the article a translation file belongs to, or undefined if that article is not published. */
function articleHref(translationFile: string): string | undefined {
  const key = path.relative(translationRoot, translationFile).replace(/\.mdx?$/, "").split(path.sep).join("/");
  const slash = key.lastIndexOf("/");
  const section = key.slice(0, slash);
  const id = key.slice(slash + 1);
  if (section === "science" || section === "personal") {
    const source = markdownFiles(path.join(contentRoot, section)).find((file) => path.basename(file).replace(/\.mdx?$/, "") === id);
    if (!source) return undefined;
    return `/${section}/${frontmatterField(source, section === "science" ? "project" : "category")}/${id}/`;
  }
  return `/${section}/${id}/`;
}

const translated = markdownFiles(translationRoot)
  .filter((file) => frontmatterField(file, "draft") !== "true")
  .map((file) => ({ file, href: articleHref(file), title: frontmatterField(file, "title") }))
  .filter((item): item is { file: string; href: string; title: string } => Boolean(item.href && item.title));

test("articles without a translation show no language switch", async ({ page }) => {
  const translatedHrefs = new Set(translated.map((item) => item.href));
  const untranslated = markdownFiles(path.join(contentRoot, "field-notes"))
    .map((file) => `/field-notes/${path.basename(file).replace(/\.mdx?$/, "")}/`)
    .find((href) => !translatedHrefs.has(href));
  test.skip(!untranslated, "every field note is translated");
  await page.goto(untranslated!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("[data-lang-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-lang-pane]")).toHaveCount(0);
});

test("EN / CN switch changes the article language and remembers the choice", async ({ page }) => {
  test.skip(translated.length === 0, "no translations published yet");
  const { href, title } = translated[0];
  await page.goto(href);
  const toggles = page.locator("[data-lang-toggle]");
  await expect(toggles).toHaveCount(2);
  await expect(toggles.first()).toBeVisible();
  const englishTitle = await page.getByRole("heading", { level: 1 }).textContent();

  await toggles.first().getByRole("button", { name: "CN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page).toHaveURL(/[?&]lang=zh\b/);
  await expect(page.locator('[data-lang-choice="zh-CN"][aria-pressed="true"]')).toHaveCount(2);
  await expect(page.locator('.prose [data-lang-pane="primary"]')).toBeHidden();
  await expect(page.locator('.prose [data-lang-pane="alt"]')).toBeVisible();

  // The choice carries over to a fresh visit without the query string.
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  // The bottom switch returns to English.
  await toggles.last().getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(englishTitle ?? "");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // A shared link chooses the language explicitly.
  await page.goto(`${href}?lang=zh`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Personal Interest lists its four columns, each with its own page", async ({ page }) => {
  await page.goto("/");
  await page.locator(".navbar .nav-links").getByRole("link", { name: "Personal", exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Personal\s*Interest/);
  const columns = page.locator(".column-card");
  await expect(columns).toHaveCount(4);
  const names = ["A General History of China", "History Talks", "Spanish Learning", "Travel Blog"];
  await expect(columns.locator("h3")).toHaveText(names);
  const hrefs = await columns.evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(hrefs).toEqual(["/personal/china-history/", "/personal/history-talks/", "/personal/spanish/", "/personal/travel/"]);
  for (const [index, href] of hrefs.entries()) {
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(names[index]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/personal/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
