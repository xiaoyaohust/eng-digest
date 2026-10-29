import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/cpu-gpu-memory-and-compute-costs.md", import.meta.url), "utf8");

describe("CPU, GPU, memory, and cost publication", () => {
  it("continues the series with explicit hypothetical assumptions and limitations", () => {
    for (const text of [
      'title: "CPUs, GPUs, GPU Memory, and Compute Costs"', "date: 2026-10-28",
      'topic: "AI Fundamentals"', "order: 7", "lang: en",
      "/ai/training-inference-and-deployment/", "invented architecture inputs",
      "including generated tokens", "working allowance is a simplifying assumption",
      "Use key-value heads", "physical storage", "not a price quote or measured benchmark",
      "At zero completions", "requires no GPU", "performs no timing experiment",
      "quality checks", "asynchronously", "live tensors remain allocated",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps the serving example, training accounting, costs, and exercises consistent", () => {
    const weights = 3_000_000_000 * 2 / 2 ** 30;
    const cachePerSequence = 2 * 24 * 8192 * 8 * 128 * 2 / 2 ** 30;
    assert.equal(cachePerSequence, 0.75);
    assert.equal((weights + 2 + 8 * cachePerSequence).toFixed(2), "13.59");
    assert.equal((weights + 2 + 12 * cachePerSequence).toFixed(2), "16.59");
    assert.equal(Math.floor((14 - weights - 2) / cachePerSequence), 8);
    assert.equal((3_000_000_000 * 16 / 2 ** 30).toFixed(2), "44.70");
    for (const text of ["8.34 GiB", "13.59 GiB", "16.59 GiB", "max batch=34",
      "$13.89", "$55.56", "10.59 GiB", "17 sequences", "$69.44"])
      assert.ok(article.includes(text), text);
  });

  it("includes complete English teaching material with accessible visuals and primary sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 4);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 1);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 1);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 5);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const prose = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(prose.trim().split(/\s+/).length >= 1200);
    assert.ok(prose.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
