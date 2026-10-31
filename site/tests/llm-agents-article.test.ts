import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/large-language-models-and-agents.md", import.meta.url), "utf8");

describe("LLM and agent foundations publication", () => {
  it("continues the Introduction to AI sequence and states the example's limits", () => {
    for (const requirement of [
      'title: "Large Language Models and Agents"', 'date: 2026-10-25T11:40:00-07:00',
      'topic: "Introduction to AI"', 'order: 4', 'lang: en',
      '/ai/discriminative-and-generative-models/',
      "A causal mask prevents a position from using later target tokens",
      "no credentials, network requests, downloaded weights, or third-party dependencies",
      "The substitute follows a fixed rule", "no measured LLM success rate",
      "The authenticated customer identifier is application state",
      "a proposal-count limit alone cannot stop a blocked network operation",
      "that answer would pass these shape checks",
      "Keep development examples separate from the final test",
    ]) assert.ok(article.includes(requirement), requirement);
  });

  it("keeps probability calculations and loop budgets consistent", () => {
    assert.ok(Math.abs(-(Math.log(0.6) + Math.log(0.5)) / 2 - 0.602) < 0.0005);
    assert.ok(Math.abs(-Math.log(0.5 * 0.4 * 0.25) / 3 - 0.999) < 0.0005);
    for (const requirement of ["0.6 × 0.5 = 0.3", "0.602", "0.05", "0.999", "including the final answer", "three tool observations"])
      assert.ok(article.includes(requirement), requirement);
  });

  it("includes English teaching prose, accessible diagrams and tables, exercises, and primary references", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 2);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 4);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    const main = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(main.trim().split(/\s+/).length >= 1200);
    assert.ok(main.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
