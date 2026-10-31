import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/training-inference-and-deployment.md", import.meta.url), "utf8");

describe("training, inference, and deployment lesson", () => {
  it("continues the existing fundamentals series with explicit experimental limits", () => {
    for (const requirement of [
      'title: "Training, Inference, and Deployment"', 'date: 2026-10-27',
      'topic: "Introduction to AI"', 'order: 5', 'lang: en',
      "/ai/from-rules-to-machine-learning/", "/ai/large-language-models-and-agents/",
      "same message reaches the model with a different input", "synthetic training counts",
      "begins allowing messages that the experiment blocked",
      "it starts no server and deploys nothing to this website",
      "no held-out improvement", "cannot prove that an upstream producer",
      "does not implement artifact authentication", "qualified review",
      "does not disable gradient recording", "future requests does not undo actions",
    ]) assert.ok(article.includes(requirement), requirement);
  });

  it("keeps training calculations and the independent comparison consistent", () => {
    const training = [[0, 0], [1, 0], [2, 1], [3, 1], [4, 0], [5, 1]];
    const heldOut = [[1, 0], [2, 1], [2, 0], [4, 1]];
    const mistakes = (data: number[][], threshold: number) => data.filter(([x, y]) => Number(x >= threshold) !== y).length;
    assert.deepEqual(Array.from({ length: 7 }, (_, threshold) => mistakes(training, threshold)), [3, 2, 1, 2, 3, 2, 3]);
    assert.equal(mistakes(heldOut, 2), 1);
    assert.equal(mistakes(heldOut, 3), 1);
    assert.equal(Number(3 >= 2), 1); // Occurrence count in training.
    assert.equal(Number(1 >= 2), 0); // Distinct count in the broken producer.
    for (const expected of ["training mistakes=1/6", "baseline=1/4, candidate=1/4", "mismatched features: rejected"])
      assert.ok(article.includes(expected), expected);
  });

  it("publishes a complete English section with diagrams, math, code, and consulted sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 1);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 2);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 1);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 1);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 4);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const main = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(main.trim().split(/\s+/).length >= 1200);
    assert.ok(main.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
