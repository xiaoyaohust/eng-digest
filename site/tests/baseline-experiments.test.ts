import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle, newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "baseline-models-and-controlled-experiments";
const previous = "why-data-leakage-distorts-evaluation";
const topic = "Building Good Experimental Habits";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("baseline models and controlled experiments lesson", () => {
  it("adds the next lesson to the latest manual topic and sorts it newest first", () => {
    const entries = ["training-validation-and-test-sets", previous, slug].map(id => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[2].data.title, "Baseline Models and Controlled Experiments");
    assert.equal(entries[2].data.topic, topic);
    assert.equal(entries[2].data.order, 16);
    assert.equal(entries[2].data.date.toISOString().slice(0, 10), "2026-11-10");
    assert.equal(entries[2].data.lang, "en");
    assert.equal(entries[2].data.draft, false);
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), entries.map(({ id }) => id));
    assert.equal(groupByLatestArticle(entries, entry => entry.data.topic)[0][0], topic);
    for (const id of [previous, "training-validation-and-test-sets"])
      assert.ok(article.includes(`/ai/${id}/`));
  });

  it("makes the baseline, ablation, budget, and final-test limitations explicit", () => {
    for (const text of ["training median", "most frequent training class", "current system",
      "Retrain after removing", "only at inference", "tuning budget", "rank-deficient",
      "smallest coefficient norm", "ties favor", "No refitting or selection",
      "does not establish", "favorable by construction", "confidence interval",
      "seed variation alone does not capture data uncertainty", "fresh evidence",
      "live randomized experiment", "qualified human oversight"])
      assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
  });

  it("keeps the worked arithmetic and exercise comparisons consistent", () => {
    assert.equal([3, 5, 7, 9, 11, 13].reduce((sum, value) => sum + value, 0) / 6, 8);
    assert.equal(((15 - 8) ** 2 + (18 - 8) ** 2) / 2, 74.5);
    assert.equal(((21 - 8) ** 2 + (22 - 8) ** 2) / 2, 182.5);
    assert.equal(((21 - 19) ** 2 + (22 - 21) ** 2) / 2, 2.5);
    assert.equal(((15 - 1) ** 2 + (18 - 1) ** 2) / 2, 242.5);
    for (const value of ["MSE=74.50", "MSE=0.50", "MSE=182.50", "MSE=2.50", "242.5", "180"])
      assert.ok(article.includes(value), value);
  });

  it("provides complete English teaching material, accessible figures, and consulted primary sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 4);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 5);
    assert.equal((article.split("## Takeaways\n")[1].split("## Exercises")[0].match(/^- /gm) ?? []).length, 5);
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const prose = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(prose.trim().split(/\s+/).length >= 1200);
    assert.ok(prose.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
