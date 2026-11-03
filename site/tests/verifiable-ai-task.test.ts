import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "from-a-vague-request-to-a-verifiable-task";
const previous = "business-metrics-and-model-metrics";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("verifiable AI task case study", () => {
  it("continues the newest manual topic and the editorial teaching sequence", () => {
    const entries = [previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.order, 13);
    assert.equal(entries[1].data.topic, "From Real-World Problems to AI Tasks");
    assert.equal(entries[1].data.date.toISOString().slice(0, 10), "2026-11-02");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, previous]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [previous, slug]);
    for (const text of [
      'title: "Case Study: From a Vague Request to a Verifiable AI Task"', "lang: en", `/ai/${previous}/`,
      "one recommendation request", "instant the request is accepted", "recheck access before serving",
      "no retrieval model was trained or benchmarked", "reference requires review",
      "unavailable at the decision point", "no causal estimate", "full observation window",
      "No latency test or user study was performed", "Production permission decisions", "test-informed development",
    ]) assert.ok(article.includes(text), text);
  });

  it("separates coverage, abstention, access failures, and release evidence", () => {
    for (const text of ["baseline: hits=3/5, coverage=60%, failures=0, fixture_pass=False",
      "candidate: hits=5/5, coverage=100%, failures=1, fixture_pass=False",
      "repaired fixture: hits=5/5, coverage=100%, failures=0, fixture_pass=True",
      "outside that usefulness denominator", "If `A` is empty", "3/6 = 50%", "4/5 = 80%"])
      assert.ok(article.includes(text), text);
    assert.equal(3 / 5, 0.6);
    assert.equal(5 / 5, 1);
    assert.equal(3 / 6, 0.5);
    assert.equal(4 / 5, 0.8);
  });

  it("provides English prose, reproducible examples, accessible visuals, exercises, and consulted sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 1);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
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
