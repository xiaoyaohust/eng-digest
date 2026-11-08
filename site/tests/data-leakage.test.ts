import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle, newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "why-data-leakage-distorts-evaluation";
const previous = "training-validation-and-test-sets";
const topic = "Building Good Experimental Habits";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("data leakage lesson", () => {
  it("continues the newest existing topic without changing the teaching sequence", () => {
    const entries = ["from-a-vague-request-to-a-verifiable-task", previous, slug].map(id => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[2].data.title, "Why Data Leakage Distorts Evaluation");
    assert.equal(entries[2].data.topic, topic);
    assert.equal(entries[2].data.order, 15);
    assert.equal(entries[2].data.date.toISOString().slice(0, 10), "2026-11-07");
    assert.equal(entries[2].data.lang, "en");
    assert.equal(entries[2].data.draft, false);
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), entries.map(({ id }) => id));
    assert.equal(groupByLatestArticle(entries, entry => entry.data.topic)[0][0], topic);
    assert.ok(article.includes(`/ai/${previous}/`));
  });

  it("distinguishes information availability, group dependence, preprocessing, and test feedback", () => {
    for (const text of [
      "ordinary overfitting", "distribution shift", "09:58", "10:04", "t_{\\mathrm{available}}",
      "labels must also have matured", "previously unseen cases", "only two distinct incidents",
      "does not estimate a real model's expected decline", "correct fitting code cannot compensate",
      "no candidate is selected", "positive, negative, or negligible", "cross-fitting", "group and time restrictions",
      "previously inspected test cases", "Shuffling labels", "does not certify", "human oversight",
    ]) assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
  });

  it("keeps the worked results, counterexample, and preprocessing arithmetic consistent", () => {
    for (const text of ["accuracy=100%, baseline=50%", "accuracy=50%, baseline=50%",
      "3/4 = 75%", "4/4 = 100%", "106/3", "35.33", "no severe incident"])
      assert.ok(article.includes(text), text);
    assert.equal((2 + 4) / 2, 3);
    assert.equal(((2 + 4 + 100) / 3).toFixed(2), "35.33");
    assert.equal(3 / 4, 0.75);
  });

  it("publishes complete English teaching material with math, a diagram, and consulted sources", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
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
