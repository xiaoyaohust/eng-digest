import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const article = readFileSync(new URL("../src/content/coding/random-value-dictionary.md", import.meta.url), "utf8");
const metadata = parse(article.split("---")[1]);

describe("random-value dictionary publication", () => {
  it("publishes both sampling contracts as one English Coding article", () => {
    assert.equal(metadata.title, "Random Values from a Dictionary: Frequency and Distinct Sampling");
    assert.equal(String(metadata.date), "2026-11-14");
    assert.equal(metadata.draft, false);
    assert.deepEqual(metadata.languages, ["java", "python"]);
    assert.ok(metadata.patterns.includes("swap-and-pop"));
    assert.ok(metadata.socialTitle.length < 65);
    assert.ok(metadata.socialDescription.length < 145);
    for (const heading of ["Problem", "Java solution", "Python solution", "Expected output", "Why it works", "Complexity"])
      assert.ok(article.includes(`## ${heading}\n`));
    assert.doesNotMatch(article, /[\u3400-\u9fff]|English translation/i);
  });

  it("keeps current occurrences, shared counts, and moved-slot references coherent", () => {
    for (const phrase of [
      "does not add another key", "same-value update", "reference to its slot",
      "preserves the value assigned", "Frequency mode does not hash values",
      "count one to zero", "repairs the moved slot's index", "c/n", "1/d",
      "Python requires them to be hashable", "single-threaded", "Missing key",
      "frequency sample is current: true", "distinct after merge: 6", "distinct after swap: 10",
      "Avoid reducing an arbitrary random integer", "without random flakiness",
    ]) assert.ok(article.includes(phrase), phrase);
    assert.equal(3 / 4, 0.75);
    assert.equal(1 / 2, 0.5);
  });

  it("states expected and amortized bounds plus retained-capacity limits", () => {
    for (const phrase of ["Expected amortized O(1)", "Expected O(1)", "O(n + d) = O(n)",
      "bounded-cost hashing and equality", "a particular insertion", "maximum live key count",
      "O(N)", "not worst-case guarantees", "arbitrary numeric weights"])
      assert.ok(article.toLowerCase().includes(phrase.toLowerCase()), phrase);
  });

  it("includes runnable solutions, six commented cases per language, and accessible teaching visuals", () => {
    assert.equal((article.match(/```java\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    for (let test = 1; test <= 6; test++) assert.equal(article.split(`Test ${test}:`).length - 1, 2);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
