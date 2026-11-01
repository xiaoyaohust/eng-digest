import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "when-you-dont-need-machine-learning";
const previous = "detection-segmentation-generation-and-decision-making";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("when machine learning is unnecessary lesson", () => {
  it("continues the latest manual topic and distinguishes specified policy from empirical guesses", () => {
    const entries = [previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.order, 11);
    assert.equal(entries[1].data.topic, "From Real-World Problems to AI Tasks");
    assert.equal(entries[1].data.date.toISOString().slice(0, 10), "2026-10-31");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, previous]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [previous, slug]);
    for (const text of [
      'title: "When You Don\'t Need Machine Learning"', "lang: en", `/ai/${previous}/`,
      "authoritative rule", "heuristic", "authenticated producer metadata",
      "no authentication or dispatch", "does not assume that review resolves every incident correctly",
      "synthetic", "no classifier has been trained or benchmarked",
      "unrelated to the six-record batch", "Few labeled examples alone do not prove",
      "strongest practical existing alternative", "only on training data",
      "positive fixed cost", "domain specialists",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps the example, break-even calculation, and exercises arithmetically consistent", () => {
    for (const text of ["registry: automatic=5, wrong=0, reviews=1, cost=1",
      "classifier: automatic=5, wrong=1, reviews=1, cost=6",
      "all review: automatic=0, wrong=0, reviews=6, cost=6",
      "after ownership update: Commerce", "30,000", "60,000", "cost two", "cost seven"])
      assert.ok(article.includes(text), text);
    assert.ok(Math.abs(20_000 * (0.1 - 0.08) - 600 + 200) < 1e-9);
    assert.ok(Math.abs(600 / (0.1 - 0.08) - 30_000) < 1e-9);
    assert.ok(Math.abs(50_000 * (0.1 - 0.08 - 0.01) - 600 + 100) < 1e-9);
  });

  it("publishes complete English teaching material with accessible visuals and primary sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
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
