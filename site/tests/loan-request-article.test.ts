import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const slug = "loan-requests-company-hierarchy-matching";
const article = readFileSync(new URL(`../src/content/coding/${slug}.md`, import.meta.url), "utf8");
const metadata = parse(article.split("---")[1]);

describe("loan request matching interview article", () => {
  it("publishes the two-part problem in Coding with Java and Python", () => {
    assert.equal(metadata.title, "Match Loan Requests Across a Company Hierarchy");
    assert.equal(String(metadata.date), "2026-11-11");
    assert.equal(metadata.draft, false);
    assert.deepEqual(metadata.languages, ["java", "python"]);
    assert.ok(metadata.patterns.includes("memoization"));
    for (const heading of ["Problem", "Java solution", "Python solution", "Expected output", "Complexity"])
      assert.ok(article.includes(`## ${heading}\n`));
    assert.doesNotMatch(article, /[\u3400-\u9fff]|English translation/i);
  });

  it("states the exact matching contract without inventing loan consumption", () => {
    for (const text of ["same user", "same top-level company", "exactly the same amount",
      "read-only candidate lookup", "insertion order", "duplicate", "signed 64-bit",
      "company absent", "fixed forest", "original merchant", "structured key",
      "single-threaded", "no hierarchy-reset method", "One loan per transaction",
      "Partial or threshold amounts", "Several parents or changing ownership"])
      assert.ok(article.includes(text), text);
  });

  it("explains linear preprocessing and output-sensitive matching honestly", () => {
    for (const text of ["iterative", "disconnected components", "recursion limit",
      "arbitrary disjoint-set representative", "O(V + E)", "O(1 + K)", "O(V + L)",
      "O(V + E + L + Q + T)", "expected bounds", "unknown merchants do not add entries"])
      assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
    const output = article.split("## Expected output\n")[1];
    assert.ok(output.includes("txn_1 -> [loan_1, loan_6]"));
    assert.ok(output.includes("Repeat txn_1 -> [loan_1, loan_6]"));
    assert.equal((article.match(/```java\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    for (const label of ["Test 1:", "Test 6:", "Test 9:", "Test 12:"])
      assert.equal(article.split(label).length - 1, 2, label);
  });
});
