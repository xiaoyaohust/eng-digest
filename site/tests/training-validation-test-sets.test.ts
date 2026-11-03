import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle, newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "training-validation-and-test-sets";
const previous = "from-a-vague-request-to-a-verifiable-task";
const topic = "Building Good Experimental Habits";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("training, validation, and test sets lesson", () => {
  it("adds a new manual topic without moving existing articles or changing their teaching order", () => {
    const entries = ["from-rules-to-machine-learning", previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[2].data.order, 14);
    assert.equal(entries[2].data.topic, topic);
    assert.equal(entries[2].data.date.toISOString().slice(0, 10), "2026-11-03");
    assert.equal(entries[0].data.topic, "Introduction to AI");
    assert.equal(entries[1].data.topic, "From Real-World Problems to AI Tasks");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, previous, "from-rules-to-machine-learning"]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), ["from-rules-to-machine-learning", previous, slug]);
    assert.deepEqual(groupByLatestArticle(entries, entry => entry.data.topic).map(([name]) => name),
      [topic, "From Real-World Problems to AI Tasks", "Introduction to AI"]);
  });

  it("keeps the fitting rule, selection, final arithmetic, and refit exercise consistent", () => {
    for (const text of [
      `/ai/${previous}/`, "hyperparameter", "training outcomes must have become available", "Group related records",
      "predetermined", "synthetic, independent builds", "without refitting", "code's selection path never consults test error",
      "train MAE=3.000, validation MAE=8.500", "train MAE=0.000, validation MAE=0.500",
      "test predictions: [19.0, 21.0]", "test MAE=1.500 minutes", "1.375", "before opening the test set",
      "Nested evaluation", "domain review",
    ]) assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
    assert.equal((3 + 5 + 7 + 9 + 11 + 13) / 6, 8);
    assert.equal((7 + 10) / 2, 8.5);
    assert.equal((0 + 1) / 2, 0.5);
    assert.equal((2 + 1) / 2, 1.5);
    assert.equal(9 / 8, 1.125);
    assert.equal((1.875 + 0.875) / 2, 1.375);
  });

  it("provides English teaching prose, accessible visuals, executable code, and primary references", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 3);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const prose = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(prose.trim().split(/\s+/).length >= 1200);
    assert.ok(prose.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
