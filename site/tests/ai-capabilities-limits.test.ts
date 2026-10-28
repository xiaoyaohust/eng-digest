import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/ai/ai-capabilities-and-limits.md", import.meta.url), "utf8");

describe("AI capabilities and limits publication", () => {
  it("continues the fundamentals sequence and states the limits of the worked example", () => {
    for (const requirement of [
      'title: "AI Capabilities and Their Limits"', 'date: 2026-10-27',
      'topic: "AI Fundamentals"', 'order: 6', 'lang: en',
      "/ai/training-inference-and-deployment/", "eight synthetic tickets",
      "with no trained model or real service behind it", "Neither can reliably distinguish",
      "additional requirements are met", "It does not establish that every model",
      "If nothing is accepted", "review always finds the correct route",
      "Real review has errors", "confidence threshold grants no additional authority",
      "trains no model, and calls no external service", "independent examples",
    ]) assert.ok(article.includes(requirement), requirement);
  });

  it("keeps coverage, conditional error, costs, and exercises arithmetically consistent", () => {
    const scores = [0.95, 0.85, 0.70, 0.55, 0.45, 0.30, 0.15, 0.05];
    const labels = [1, 1, 0, 1, 0, 1, 0, 1];
    const accepted = scores.map((score, index) => ({ score, label: labels[index] })).filter(({ score }) => Math.max(score, 1 - score) >= 0.8);
    assert.equal(accepted.length, 4);
    assert.equal(accepted.filter(({ score, label }) => Number(score >= 0.5) !== label).length, 1);
    assert.equal(scores.filter((score, index) => Number(score >= 0.5) !== labels[index]).length, 3);
    for (const expected of ["37.5%", "25.0%", "cost=9", "cost=7", "cost=8", "5 × 3 = 15", "5 × 1 + 4 = 9"])
      assert.ok(article.includes(expected), expected);
  });

  it("includes a complete English section, accessible visuals, exercises, and primary references", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
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
