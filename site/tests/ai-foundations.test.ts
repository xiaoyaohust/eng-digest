import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AI_SECTION_NAME, aiArticleHref, orderAIArticles } from "../src/data/ai.ts";
import rehypeMath from "../src/lib/rehypeMath.mjs";

const article = readFileSync(new URL("../src/content/ai/from-rules-to-machine-learning.md", import.meta.url), "utf8");
const pre = (language: string, source: string) => ({
  type: "element", tagName: "pre", properties: {}, children: [{
    type: "element", tagName: "code", properties: { className: [`language-${language}`] },
    children: [{ type: "text", value: source }],
  }],
});

describe("AI Foundations publication", () => {
  it("keeps reading order independent of publication date without mutating inputs", () => {
    const entries = [
      { id: "later", data: { order: 2, date: new Date("2026-10-01") } },
      { id: "first", data: { order: 1, date: new Date("2026-10-24") } },
    ];
    assert.equal(AI_SECTION_NAME, "AI Foundations");
    assert.equal(aiArticleHref(entries[0]), "/ai/later/");
    assert.deepEqual(orderAIArticles(entries).map((entry) => entry.id), ["first", "later"]);
    assert.equal(entries[0].id, "later");
  });

  it("renders consecutive explicit math fences with accessible MathML and no client runtime", () => {
    const tree = { type: "root", children: [pre("math", "x^2"), pre("math", "y^3")] };
    rehypeMath()(tree);
    const serialized = JSON.stringify(tree);
    assert.equal((serialized.match(/katex-display/g) ?? []).length, 2);
    assert.equal((serialized.match(/application\/x-tex/g) ?? []).length, 2);
    assert.ok(serialized.includes('"tagName":"math"'));
    assert.ok(!serialized.includes('"tagName":"script"'));
  });

  it("preserves currency, ordinary code, and Mermaid without treating them as math", () => {
    const tree = { type: "root", children: [
      { type: "text", value: "Price $99.99, shipping $5.00" },
      pre("python", 'print("$10")'), pre("mermaid", "flowchart TB\nA-->B"),
    ] };
    const before = JSON.stringify(tree);
    rehypeMath()(tree);
    assert.equal(JSON.stringify(tree), before);
  });

  it("fails the build on malformed formulas and disables trusted HTML commands", () => {
    assert.throws(() => rehypeMath()({ type: "root", children: [pre("math", "\\frac{")] }));
    const tree = { type: "root", children: [pre("math", "\\href{javascript:alert(1)}{x}")] };
    rehypeMath()(tree);
    assert.ok(!JSON.stringify(tree).includes('"tagName":"a"'));
  });

  it("teaches the requested English section with consistent experimental controls", () => {
    for (const contract of [
      'lang: en', 'date: 2026-10-24', 'topic: "AI Fundamentals"', 'order: 1',
      "The following dataset is synthetic", "unique best candidate", "independent check",
      "Both approaches make one mistake out of four", "Data leakage", "validation set",
      "The verified output", "five units", "costing two units",
      "## Takeaways", "## Exercises", "## Answer guidance",
    ]) assert.ok(article.includes(contract), contract);
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
