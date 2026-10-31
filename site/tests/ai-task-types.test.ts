import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const slug = "classification-regression-ranking-and-clustering";
const previous = "defining-goals-inputs-outputs-and-constraints";
const article = readFileSync(new URL(`../src/content/ai/${slug}.md`, import.meta.url), "utf8");

describe("classification, regression, ranking, and clustering lesson", () => {
  it("continues the newest manual topic while keeping discovery and teaching order separate", () => {
    const entries = [previous, slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/ai/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.order, 9);
    assert.equal(entries[1].data.date.toISOString(), "2026-10-31T00:00:00.000Z");
    assert.deepEqual(groupByLatestArticle(entries, (entry) => entry.data.topic).map(([name, items]) =>
      [name, items.map(({ id }) => id)]), [["From Real-World Problems to AI Tasks", [slug, previous]]]);
    assert.deepEqual(orderAIArticles(entries).map(({ id }) => id), [previous, slug]);
    for (const text of [
      'title: "Classification, Regression, Ranking, and Clustering"', "lang: en",
      `/ai/${previous}/`, "synthetic", "no trained model or real performance experiment",
      "strictly increasing transformation", "within a context", "Cluster numbers are arbitrary",
      "not a complete k-means implementation", "fixed scaling", "empty groups",
      "domain review and validation", "independent evaluation",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps the worked metrics, baseline, cluster distances, and answer guidance consistent", () => {
    assert.equal([2, 5, 2, 5].reduce((a, b) => a + b) / 4, 3.5);
    assert.equal([8, 20, 12, 0].reduce((a, b) => a + b) / 4, 10);
    const grades = [3, 0, 2, 1], order = [1, 3, 0, 2];
    assert.equal(order.slice(0, 2).filter((index) => grades[index] >= 2).length, 0);
    assert.equal(grades.slice(0, 2).filter((grade) => grade >= 2).length, 1);
    assert.ok(Math.abs(4 * (0.05 ** 2 + 0.05 ** 2) - 0.02) < 1e-12);
    for (const text of ["75%", "3.5 minutes", "B, D, A, C", "FIFO precision@2: 50%",
      "cluster assignments: 0, 0, 1, 1", "(0.15, 0.15)", "(0.85, 0.85)",
      "within-group squared distance: 0.02", "MAE is `12/4 = 3 minutes`", "`1, 1, 0, 0`"])
      assert.ok(article.includes(text), text);
  });

  it("publishes complete English material with accessible visuals and verified primary references", () => {
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## References consulted\n")[1].split("## Takeaways")[0].match(/^- \[/gm) ?? []).length, 6);
    for (const heading of ["## Takeaways", "## Exercises", "## Answer guidance"]) assert.ok(article.includes(heading));
    assert.equal((article.split("## Exercises\n")[1].split("## Answer guidance")[0].match(/^\d+\./gm) ?? []).length, 3);
    const main = article.replace(/^---\n[\s\S]*?\n---\n/, "").split("## References consulted")[0].replace(/```[\s\S]*?```/g, "");
    assert.ok(main.trim().split(/\s+/).length >= 1200);
    assert.ok(main.trim().split(/\s+/).length <= 2000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
