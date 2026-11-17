import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { orderAIArticles } from "../src/data/ai.ts";
import { newestFirst } from "../src/lib/contentOrdering.ts";

const slug = "experiment-records-version-control-and-reproduction";
const previous = "randomness-repeated-experiments-and-variation";
const english = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");
const chinese = readFileSync(new URL(`../src/content/translations/ai/${slug}.md`, import.meta.url), "utf8");
const metadata = (text: string) => parse(text.split("---")[1]);
const blocks = (text: string, lang: string) => [...text.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g"))].map(match => match[1]);

describe("bilingual experiment records lesson", () => {
  it("continues the newest manual topic and its teaching order without moving prior articles", () => {
    const en = metadata(english), zh = metadata(chinese);
    assert.equal(en.title, "Experiment Records, Version Control, and Reproduction");
    assert.equal(en.topic, "Building Good Experimental Habits");
    assert.equal(en.order, 18);
    assert.equal(en.lang, "en");
    assert.equal(String(en.date), "2026-11-16");
    assert.equal(en.draft, false);
    assert.ok(en.socialTitle.length < 65 && en.socialDescription.length < 145);
    assert.equal(zh.lang, "zh-CN");
    assert.equal(zh.title, "实验记录、版本管理与复现");
    assert.equal(zh.draft, false);
    const entries = [slug, previous].map(id => {
      const data = metadata(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8"));
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.deepEqual(orderAIArticles(entries).map(entry => entry.id), [previous, slug]);
    assert.ok(english.includes(`/ai/${previous}/`) && chinese.includes(`/ai/${previous}/`));
  });

  it("keeps translated code, equations, output, diagrams, and their section placement consistent", () => {
    const outline = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n").flatMap(line => {
      if (line.startsWith("## ")) return ["heading"];
      if (line.startsWith("```")) return [line];
      if (line.startsWith('<div class="table-scroll"')) return ["table"];
      if (/^\*(Figure|图) /.test(line)) return ["caption"];
      return [];
    });
    assert.deepEqual(outline(chinese), outline(english));
    for (const lang of ["python", "math", "bash", "text"]) {
      assert.equal(blocks(english, lang).length, 1);
      assert.deepEqual(blocks(chinese, lang), blocks(english, lang));
    }
    assert.equal(blocks(english, "mermaid").length, 1);
    assert.equal(blocks(english, "mermaid")[0].replace(/"[^"]*"/g, '"label"'),
      blocks(chinese, "mermaid")[0].replace(/"[^"]*"/g, '"label"'));
    for (const text of [english, chinese]) {
      assert.equal((text.match(/class="table-scroll"/g) ?? []).length, 2);
      assert.equal((text.match(/tabindex="0"/g) ?? []).length, 2);
      assert.equal((text.match(/role="region" aria-label="[^"]+"/g) ?? []).length, 2);
    }
    const refs = (text: string) => [...text.matchAll(/^- \[[^\]]+\]\((https:[^)]+)\)/gm)].map(match => match[1]);
    assert.equal(refs(english).length, 5);
    assert.deepEqual(refs(chinese), refs(english));
  });

  it("keeps synthetic scores, dimensions, tolerances, and exercise guidance coherent", () => {
    const trainMean = (2 + 4 + 6 + 8) / 4;
    assert.equal(trainMean, 5);
    assert.equal([10, 12, 14].reduce((sum, value) => sum + Math.abs(value - trainMean), 0) / 3, 7);
    assert.ok(Math.abs((1e-6 + 1e-5 * 0.25) - 0.0000035) < 1e-20);
    assert.ok(Math.abs(0.2500002 - 0.25) < 0.0000035);
    for (const phrase of ["synthetic teaching fixture", "length-two vector", "finite scalar errors in minutes",
      "dimensionless", "absolute term", "Python 3.11.4", "reference MAE: 7.000", "candidate MAE: 0.000"])
      assert.ok(english.includes(phrase), phrase);
    assert.equal((english.split("## Takeaways\n")[1].split("## Exercises")[0].match(/^- /gm) ?? []).length, 4);
    assert.equal((english.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    assert.equal((english.split("## Answer guidance\n")[1].match(/^\d+\./gm) ?? []).length, 3);
  });

  it("separates integrity, computational replay, replication, retained bytes, and environment reconstruction", () => {
    for (const phrase of ["Integrity verification", "Computational replay", "Independent replication",
      "does not automatically include untracked", "actual executed source", "resolved configuration",
      "checksum identifies bytes", "relative to a trusted manifest", "can replace their checksums too",
      "access-controlled", "refuses to reuse a directory", "marks the manifest failed",
      "incomplete directory", "never executes a downloaded source file", "without reconstructing that environment",
      "current interpreter", "temporary directories disappear", "different per-case predictions",
      "Reproducible leakage remains leakage", "qualified human oversight"])
      assert.ok(english.includes(phrase), phrase);
    const prose = english.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    const count = prose.trim().split(/\s+/).length;
    assert.ok(count >= 1200 && count <= 2000, String(count));
    assert.doesNotMatch(english, /[\u3400-\u9fff]/);
    assert.doesNotMatch(english, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
