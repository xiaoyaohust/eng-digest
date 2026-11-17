import { getEntry, render } from "astro:content";
import type { MarkdownHeading } from "astro";
import { readingTime } from "./url";

export type ArticleLang = "en" | "zh-CN";

export interface ArticleTranslation {
  lang: ArticleLang;
  title: string;
  description: string;
  headings: MarkdownHeading[];
  readingMinutes: number;
  hasMath: boolean;
  Content: Awaited<ReturnType<typeof render>>["Content"];
}

/** Key of the translation file for an article: `<section>/<article id>`,
 * matching src/content/translations/<section>/<article id>.md. */
export function translationKey(section: string, id: string): string {
  return `${section}/${id}`;
}

/**
 * The published second-language version of an article, if one exists.
 * A translation in the article's own language is ignored, so a mislabeled
 * file never produces a toggle between two copies of the same language.
 */
export async function loadTranslation(
  section: string,
  id: string,
  primaryLang: ArticleLang = "en",
): Promise<ArticleTranslation | undefined> {
  const entry = await getEntry("translations", translationKey(section, id));
  if (!entry || entry.data.draft || entry.data.lang === primaryLang) return undefined;
  const { Content, headings, remarkPluginFrontmatter } = await render(entry);
  return {
    lang: entry.data.lang,
    title: entry.data.title,
    description: entry.data.description,
    headings,
    readingMinutes: readingTime(entry.body ?? ""),
    hasMath: remarkPluginFrontmatter.hasMath === true,
    Content,
  };
}
