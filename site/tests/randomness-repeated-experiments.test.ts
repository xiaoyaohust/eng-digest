import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "randomness-repeated-experiments-and-variation";
const previous = "baseline-models-and-controlled-experiments";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");
const metadata = parse(article.split("---")[1]);

describe("randomness and repeated experiments lesson", () => {
  it("continues the latest manual AI topic with the next teaching order", () => {
    assert.equal(metadata.title, "Randomness, Repeated Experiments, and Result Variation");
    assert.equal(metadata.topic, "Building Good Experimental Habits");
    assert.equal(metadata.order, 17);
    assert.equal(String(metadata.date), "2026-11-13");
    assert.equal(metadata.lang, "en");
    assert.equal(metadata.draft, false);
    assert.ok(metadata.socialTitle.length < 65);
    assert.ok(metadata.socialDescription.length < 145);
    const entries = [previous, slug].map(id => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.deepEqual(orderAIArticles(entries).map(entry => entry.id), [previous, slug]);
    assert.ok(article.includes(`/ai/${previous}/`));
  });

  it("separates replay, conditional variation, data uncertainty, and model selection", () => {
    for (const phrase of [
      "same validation cases", "training-row subsampling", "no random initialization",
      "the actual sampled rows explicitly", "not automatically a confidence interval",
      "conditional on the fixed data", "predeclared reporting rule", "no repeat is selected",
      "final test set is deliberately absent", "planned sequential analysis", "creates an ensemble",
      "qualified human oversight", "least-squares fitting procedure", "other numerical-library builds",
    ]) assert.ok(article.includes(phrase), phrase);
  });

  it("keeps the four-run example and uncertainty calculations coherent", () => {
    const candidate = [0.2, 0.4, 0.1, 0.3];
    const baseline = [0.25, 0.3, 0.2, 0.25];
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const sd = (values: number[]) => Math.sqrt(values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0) / (values.length - 1));
    const differences = baseline.map((value, index) => value - candidate[index]);
    assert.equal(mean(candidate), 0.25);
    assert.equal(sd(candidate).toFixed(4), "0.1291");
    assert.equal(sd(baseline).toFixed(4), "0.0408");
    assert.ok(Math.abs(mean(differences)) < 1e-15);
    assert.equal(sd(differences).toFixed(4), "0.0913");
    assert.equal((sd(differences) / Math.sqrt(4)).toFixed(4), "0.0456");
    for (const value of ["0.1291", "0.0408", "0.0456", "mean=3.248", "SD=0.982", "SE=0.347"])
      assert.ok(article.includes(value), value);
  });

  it("provides a complete English section with static teaching, exercises, and verified example output", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/```text\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 1);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 7);
    assert.equal((article.split("## Takeaways\n")[1].split("## Exercises")[0].match(/^- /gm) ?? []).length, 4);
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const prose = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(prose.trim().split(/\s+/).length >= 1200);
    assert.ok(prose.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
