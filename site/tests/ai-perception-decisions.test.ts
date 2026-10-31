import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "detection-segmentation-generation-and-decision-making";
const previous = "classification-regression-ranking-and-clustering";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("detection, segmentation, generation, and decision-making publication", () => {
  it("continues the latest topic and keeps the displayed calendar date while sorting newest first", () => {
    const entries = [previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.order, 10);
    assert.equal(entries[1].data.topic, "From Real-World Problems to AI Tasks");
    assert.equal(entries[1].data.date.toISOString().slice(0, 10), "2026-10-31");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, previous]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [previous, slug]);
    for (const text of [
      'title: "Detection, Segmentation, Generation, and Decision-Making"', "lang: en",
      `/ai/${previous}/`, "half-open bounds", "one-to-one matching", "semantic segmentation",
      "Instance segmentation", "mask marks damage rather than the whole parcel",
      "undefined IoU", "do not produce `p`", "do not assume a perfect reviewer",
      "does not waive those restrictions", "no report", "executes no parcel action",
      "cannot create an authorized release record", "independent annotations",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps overlap calculations, background accuracy, expected losses, and exercises consistent", () => {
    assert.equal(12 / (16 + 16 - 12), 0.6);
    assert.equal(4 / (6 + 6 - 4), 0.5);
    assert.equal((44 / 48 * 100).toFixed(1), "91.7");
    assert.equal((42 / 48 * 100).toFixed(1), "87.5");
    const costs = [[0, 40], [6, 2], [2, 3]];
    assert.deepEqual(costs.map(([a, b]) => ((0.9 * a) + (0.1 * b)).toFixed(1)), ["4.0", "5.6", "2.1"]);
    for (const text of ["parcel box IoU: 0.60", "damage-mask IoU: 0.50", "91.7%", "87.5%",
      "review expected loss: 2.1", "recommendation: review", "0.8, 5.92, 2.02", "36, 2.4, 2.9", "`8/24 = 1/3`"])
      assert.ok(article.includes(text), text);
  });

  it("includes a complete English section with accessible visuals, code, and primary references", () => {
    const svg = readFileSync(new URL("../public/ai/parcel-inspection-masks.svg", import.meta.url), "utf8");
    assert.equal((svg.match(/data-pixel=/g) ?? []).length, 12);
    assert.equal((svg.match(/data-overlap=/g) ?? []).length, 4);
    assert.equal((svg.match(/data-missed=/g) ?? []).length, 2);
    assert.equal((svg.match(/data-extra=/g) ?? []).length, 2);
    assert.ok(article.includes('src="/ai/parcel-inspection-masks.svg"'));
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
