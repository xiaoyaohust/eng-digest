import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { scienceArticleHref, scienceProjects } from "../src/data/scienceProjects.ts";

const article = readFileSync(new URL("../src/content/science/stellar-clocks-phase-two.md", import.meta.url), "utf8");
const previous = readFileSync(new URL("../src/content/science/stellar-clocks.md", import.meta.url), "utf8");
const evidence = readFileSync(new URL("../public/science/eclipse-atlas/phase-two-evidence.md", import.meta.url), "utf8");

describe("Eclipse Atlas phase-two publication", () => {
  it("keeps the historical note and links the closed analysis line to its follow-up", () => {
    const path = scienceArticleHref({ id: "stellar-clocks-phase-two", data: { project: "eclipse-atlas" } });
    assert.equal(path, "/science/eclipse-atlas/stellar-clocks-phase-two/");
    assert.ok(previous.includes(path));
    assert.ok(previous.includes("historical plans, not active work"));
    assert.ok(article.includes("/science/eclipse-atlas/stellar-clocks/"));
    assert.equal(scienceProjects["eclipse-atlas"].status, "RESEARCH ARCHIVE");
    assert.ok(scienceProjects["eclipse-atlas"].statusNote.includes("closed after validation review"));
  });

  it("preserves numerical qualifications and the corrected archival gate", () => {
    for (const value of ["95.1%", "75.4%", "96.6%", "77.4%", "−0.002 to 0.062", "149", "400", "77.45%", "87.10%", "5.15%", "600 seconds"]) {
      assert.ok(article.includes(value), `Missing checked result: ${value}`);
    }
    for (const qualifier of ["four systems and eight system–sector clusters", "not a population sample", "not measurements of real stellar systematics", "did not establish an independent false-flag rate", "did not measure tenfold error underestimation", "no tested precision passed", "No external expert has endorsed"]) {
      assert.ok(article.includes(qualifier), `Missing scope qualification: ${qualifier}`);
    }
    for (const source of ["87f8c7d993c9b3864f5c247024e352aaa4ee993d", "96d2bb6c9fcb5145d3610fee8ab65494b79fe5f6", "round9_r10_erratum.json", "sd_exists", "cost metadata"]) {
      assert.ok(evidence.includes(source), `Missing provenance: ${source}`);
    }
  });

  it("publishes the three unaltered project figures with verified hashes", () => {
    const figures = [
      ["timing-coverage.png", "259283258df9cfa2791780cb38e4635abbc4f21304efe2774d1e4cb08cc7f18b"],
      ["correlated-errors.png", "b450d48ffcb4105ab8f0d875dcb55da4b3b08aae9604a352b237cc6f2a8ac6e6"],
      ["shape-detectability.png", "e2398830cf09a0b51a22a608b28213b9009817200d24576606ccb26e88273303"],
    ];
    assert.equal((article.match(/!\[/g) ?? []).length, figures.length);
    for (const [file, hash] of figures) {
      const bytes = readFileSync(new URL(`../public/science/eclipse-atlas/phase-two/${file}`, import.meta.url));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
      assert.ok(evidence.includes(hash));
      assert.ok(article.includes(`/science/eclipse-atlas/phase-two/${file}`));
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    }
  });

  it("keeps the follow-up English and free of the requested stock wording", () => {
    assert.ok(article.includes("lang: en"));
    assert.ok(article.includes("date: 2026-10-14"));
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\/Users\/|third-party paper PDFs\]\(/);
    const banned = /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i;
    assert.doesNotMatch(article, banned);
  });
});
