import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/discriminative-and-generative-models.md", import.meta.url), "utf8");

describe("discriminative and generative models publication", () => {
  it("follows the existing AI sequence and introduces the intended distinctions", () => {
    for (const requirement of [
      'title: "Discriminative and Generative Models"', 'date: 2026-10-25', 'order: 3',
      'topic: "Introduction to AI"', 'lang: en', '/ai/ai-machine-learning-deep-learning/',
      "A discriminative classifier can also sample a label",
      "without providing a tractable probability calculation",
      "The presence of a vertical bar alone cannot distinguish these uses",
      "It contains no words, grammar, sender, or message body",
      "no independence assumption across multiple features",
      "They are not measured accuracy",
    ]) assert.ok(article.includes(requirement), requirement);
  });

  it("keeps the first section's labels and the binary feature conversion consistent", () => {
    const rows = [...article.matchAll(/^\| T(\d) \| (\d) \| ([01]) \| ([01]) \|$/gm)];
    assert.equal(rows.length, 6);
    const expectedLabels = [0, 0, 1, 1, 0, 1];
    const counts = [[0, 0], [0, 0]];
    for (const [, id, count, feature, label] of rows) {
      assert.equal(Number(feature), Number(count) >= 2 ? 1 : 0);
      assert.equal(Number(label), expectedLabels[Number(id) - 1]);
      counts[Number(label)][Number(feature)] += 1;
    }
    assert.deepEqual(counts, [[2, 1], [0, 3]]);
    const joint = counts.map((row) => row.map((count) => 0.5 * (count + 1) / 5));
    assert.deepEqual(joint, [[0.3, 0.2], [0.1, 0.4]]);
    assert.ok(Math.abs(joint[1][1] / (joint[0][1] + joint[1][1]) - 2 / 3) < 1e-12);
    assert.ok(article.includes("[[0.3, 0.2], [0.1, 0.4]]"));
  });

  it("publishes readable examples, four equations, two diagrams, and consulted references", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 4);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 2);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 4);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    const main = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(main.trim().split(/\s+/).length >= 1200);
    assert.ok(main.trim().split(/\s+/).length <= 2100);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
