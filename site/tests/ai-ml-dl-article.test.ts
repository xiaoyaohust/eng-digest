import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/ai-machine-learning-deep-learning.md", import.meta.url), "utf8");

describe("AI, ML, and DL section editorial checks", () => {
  it("follows the first Introduction to AI section without inventing a section number", () => {
    for (const field of [
      'title: "How AI, Machine Learning, and Deep Learning Fit Together"',
      'topic: "Introduction to AI"', "order: 2", "date: 2026-10-24", "lang: en",
      "/ai/from-rules-to-machine-learning/",
    ]) assert.ok(article.includes(field), field);
    assert.doesNotMatch(article, /^## \d+[. ]/m);
  });

  it("qualifies the taxonomy, learned representations, and mixed application responsibilities", () => {
    for (const contract of [
      "AI includes methods that work without learning from data",
      "DL is a family within ML, and ML is part of AI",
      "A shallow neural network can have learned hidden features",
      "no universal layer-count boundary",
      "the whole stack can be combined into one calculation of the same form",
      "No prediction from such a network has been computed for this example",
      "confound a change in model family with a change in input features",
      "does not automatically update those parameters",
    ]) assert.ok(article.includes(contract), contract);
  });

  it("checks the synthetic message predictions and the cost exercise independently", () => {
    const rows = [...article.matchAll(/^\| (M\d) \| [^|]+ \| (\d+) \| ([01]), [^|]+ \| ([01]), [^|]+ \|$/gm)];
    assert.equal(rows.length, 4);
    let totalCost = 0;
    const wrong = [];
    for (const [, id, count, label, prediction] of rows) {
      const expected = Number(count) >= 2 ? 1 : 0;
      assert.equal(Number(prediction), expected, id);
      if (expected !== Number(label)) {
        wrong.push(id);
        totalCost += expected === 1 ? 5 : 1;
      }
    }
    assert.deepEqual(wrong, ["M1", "M4"]);
    assert.equal(totalCost, 6);
    assert.ok(article.includes("Total cost is six units"));
  });

  it("publishes two diagrams, two accessible tables, and five consulted primary references", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 2);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 5);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    const main = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(main.trim().split(/\s+/).length >= 1200);
    assert.ok(main.trim().split(/\s+/).length <= 2100);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
