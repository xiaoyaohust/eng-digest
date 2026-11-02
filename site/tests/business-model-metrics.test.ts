import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "business-metrics-and-model-metrics";
const previous = "when-you-dont-need-machine-learning";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("business and model metrics lesson", () => {
  it("continues the latest manual category and preserves discovery and teaching order", () => {
    const entries = [previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.order, 12);
    assert.equal(entries[1].data.topic, "From Real-World Problems to AI Tasks");
    assert.equal(entries[1].data.date.toISOString().slice(0, 10), "2026-11-01");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, previous]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [previous, slug]);
    for (const text of [
      'title: "Business Metrics and Model Metrics"', "lang: en", `/ai/${previous}/`,
      "independently of the model's prediction", "synthetic batch", "no model was trained",
      "It serves as a decision proxy", "ordinary handling costs", "separately from penalty",
      "separate test set", "Shared specialist queues", "undefined rate", "full 30-minute observation period",
      "domain specialists", "causal proof",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps classifications, penalties, capacity, and exercise arithmetic consistent", () => {
    for (const text of ["accuracy=95.0%, precision=85.7%, recall=60.0%, penalty=810",
      "accuracy=94.0%, precision=64.3%, recall=90.0%, penalty=250",
      "B with capacity 100: within_capacity=False", "30c = 80", "7.5%", "exceeding the limit by 40"])
      assert.ok(article.includes(text), text);
    assert.equal((60 + 890) / 1000, 0.95);
    assert.equal((90 + 850) / 1000, 0.94);
    assert.equal(20 * 40 + 10 - (20 * 10 + 50), 560);
    assert.equal(3 * 40 + 2 * 10, 140);
    assert.equal(3 * 10 + 2 * 50, 130);
    assert.ok(Math.abs(6 / 80 * 100 - 7.5) < 1e-9);
  });

  it("provides English teaching material, accessible tables, a diagram, equations, and consulted sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 4);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const prose = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(prose.trim().split(/\s+/).length >= 1200);
    assert.ok(prose.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
