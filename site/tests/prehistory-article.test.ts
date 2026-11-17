import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { personalTopicId, personalArticleHref } from "../src/data/personal.ts";
import { groupByLatestArticle } from "../src/lib/contentOrdering.ts";

const slug = "prehistory-sites-and-archaeological-evidence";
const zh = readFileSync(new URL(`../src/content/personal/${slug}.md`, import.meta.url), "utf8");
const en = readFileSync(new URL(`../src/content/translations/personal/${slug}.md`, import.meta.url), "utf8");
const topic = "第一章 史前中国的自然环境与考古学证据";
const metadata = (text: string) => parse(text.split("---")[1]);

describe("prehistoric China article and manual chapters", () => {
  it("publishes Chinese as the primary language with an English alternate in the requested chapter", () => {
    const data = metadata(zh);
    assert.equal(data.category, "china-history");
    assert.equal(data.topic, topic);
    assert.equal(data.lang, "zh-CN");
    assert.equal(metadata(en).lang, "en");
    assert.equal(data.draft, false);
    assert.equal(metadata(en).draft, false);
    assert.equal(personalArticleHref({ id: slug, data }), `/personal/china-history/${slug}/`);
    assert.ok(data.socialTitle.length < 65 && data.socialDescription.length < 160);
    const main = zh.split("## 发现与研究时间线")[0].replace(/^---\n[\s\S]*?\n---/, "");
    assert.ok((main.match(/[\u3400-\u9fff]/g) ?? []).length >= 6000);
  });

  it("aligns paragraphs, section boundaries, illustration placement, sources, and research timeline across languages", () => {
    const outline = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, "").trim().split(/\n\s*\n/).map(block => {
      if (block.startsWith("## ")) return "heading";
      if (block.startsWith("```")) return "diagram";
      if (block.startsWith("<figure>")) return "illustration";
      if (block.startsWith('<p class="figure-caption">')) return "caption";
      if (block.startsWith("<details>")) return "title-options";
      if (/^1\./.test(block)) return "timeline";
      if (block.startsWith("* ")) return "people";
      return "paragraph";
    });
    assert.deepEqual(outline(en), outline(zh));
    const links = (text: string) => [...text.matchAll(/\]\((https:[^)]+)\)/g)].map(match => match[1]);
    assert.deepEqual(links(en), links(zh));
    const dates = (text: string) => [...text.matchAll(/^\d+\. (?:公元)?(\d{4})/gm)].map(match => match[1]);
    assert.equal(dates(zh).length, 14);
    assert.deepEqual(dates(en), dates(zh));
    for (const text of [zh, en]) assert.equal((text.match(/<li>/g) ?? []).length, 5);
    const diagrams = (text: string) => [...text.matchAll(/```mermaid\n([\s\S]*?)\n```/g)].map(match => match[1].replace(/"[^"]*"/g, '"label"'));
    assert.equal(diagrams(en).length, 2);
    assert.deepEqual(diagrams(en), diagrams(zh));
  });

  it("ships shared image assets with reserved layout space and distinguishes art, local sequence, and debated identity", () => {
    const images = (text: string) => [...text.matchAll(/<img src="([^"]+)" width="1536" height="1024" loading="lazy" decoding="async" alt="[^"]+"/g)].map(match => match[1]);
    assert.equal(images(zh).length, 2);
    assert.deepEqual(images(en), images(zh));
    for (const src of images(zh)) assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)));
    assert.ok(zh.includes("【史料存在争议】") && en.includes("[Historical evidence remains disputed]"));
    assert.ok(zh.includes("不是原始剖面图") && en.includes("not an original section drawing"));
    assert.equal((en.match(/AI generated illustration/g) ?? []).length, 2);
    assert.doesNotMatch(zh.replace(/https:[^)]+/g, ""), /[—–]/);
    assert.doesNotMatch(en.replace(/https:[^)]+/g, "").replace(/^---\n[\s\S]*?\n---\n/, "").replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, ""), /[—–]/);
  });

  it("keeps manual chapter anchors stable and orders chapters and their articles by the newest publication", () => {
    assert.equal(personalTopicId(topic), personalTopicId(topic));
    assert.notEqual(personalTopicId("A B"), personalTopicId("A-B"));
    assert.notEqual(personalTopicId("第一章"), personalTopicId("第二章"));
    const items = [
      { id: "old", data: { date: new Date("2020-01-01"), topic } },
      { id: "other", data: { date: new Date("2026-01-01") } },
      { id: "new", data: { date: new Date("2026-11-16"), topic } },
    ];
    const groups = groupByLatestArticle(items, item => item.data.topic ?? "Other articles");
    assert.deepEqual(groups.map(([name, entries]) => [name, entries.map(item => item.id)]), [[topic, ["new", "old"]], ["Other articles", ["other"]]]);
    assert.deepEqual(items.map(item => item.id), ["old", "other", "new"]);
  });
});
