import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readingTime } from "../src/lib/url.ts";
import { scienceArticleHref } from "../src/data/scienceProjects.ts";

describe("science article metadata", () => {
  it("estimates Chinese reading time without whitespace", () => {
    assert.equal(readingTime("星".repeat(3200)), 8);
  });
  it("keeps the existing English estimate and combines mixed text", () => {
    assert.equal(readingTime("word ".repeat(600)), 3);
    assert.equal(readingTime("星".repeat(800) + " word".repeat(400)), 4);
    assert.equal(readingTime(""), 1);
  });
  it("builds the same project/article path for every listing", () => {
    assert.equal(scienceArticleHref({ id: "stellar-clocks", data: { project: "eclipse-atlas" } }), "/science/eclipse-atlas/stellar-clocks/");
  });
});
