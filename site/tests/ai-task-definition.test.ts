import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "defining-goals-inputs-outputs-and-constraints";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");
const previous = [
  "from-rules-to-machine-learning", "ai-machine-learning-deep-learning",
  "discriminative-and-generative-models", "large-language-models-and-agents",
  "training-inference-and-deployment", "ai-capabilities-and-limits",
  "cpu-gpu-memory-and-compute-costs",
];

describe("AI task definition and manual categories", () => {
  it("groups the existing seven lessons without changing dates, URLs, or teaching order", () => {
    const entries = [...previous, slug].map((id) => ({
      id, data: parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]),
    })).map((entry) => ({ ...entry, data: { ...entry.data, date: new Date(entry.data.date) } }));
    for (const entry of entries.slice(0, previous.length)) assert.equal(entry.data.topic, "Introduction to AI");
    const groups = groupByLatestArticle(entries, (entry) => entry.data.topic);
    assert.deepEqual(groups.map(([name]) => name), ["From Real-World Problems to AI Tasks", "Introduction to AI"]);
    assert.deepEqual(groups[0][1].map(({ id }) => id), [slug]);
    assert.equal(groups[1][1][0].id, "cpu-gpu-memory-and-compute-costs");
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [...previous, slug]);
    assert.equal(entries[0].data.date.toISOString(), "2026-10-24T00:00:00.000Z");
    assert.equal(entries[6].data.date.toISOString(), "2026-10-28T00:00:00.000Z");
  });

  it("states a complete, bounded task and distinguishes error costs from capacity and causal evidence", () => {
    for (const text of [
      'title: "Defining Goals, Inputs, Outputs, and Constraints"', "date: 2026-10-31",
      'topic: "From Real-World Problems to AI Tasks"', "order: 8", "lang: en",
      "unit of prediction", "received before the cutoff", "unavailable prediction",
      "report their count", "Report later cancellations separately", "capacity limit",
      "synthetic deliveries", "no model has been trained or benchmarked",
      "hard constraint", "violates capacity", "population-level ranking",
      "independent examples", "post-release outcomes are affected by the system itself",
      "trains nothing and calls no service", "domain specialists",
    ]) assert.ok(article.includes(text), text);
  });

  it("includes English teaching material, accessible visuals, and four consulted primary sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
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
