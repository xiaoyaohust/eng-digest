import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { founder } from "../src/data/founder.ts";

describe("founder introduction", () => {
  it("uses the supplied name, career highlights, and LinkedIn profile", () => {
    assert.equal(founder.name, "Yao Xiao");
    assert.equal(founder.jobTitle, "Staff Software Engineer");
    assert.equal(founder.employer, "Uber");
    assert.equal(founder.publicationRole, "Founder & Technical Writer");
    assert.deepEqual(founder.previousCompanies, ["Coupang", "DoorDash", "eBay"]);
    assert.equal(founder.linkedIn, "https://www.linkedin.com/in/yaoxiaoduke/");
    assert.doesNotMatch(JSON.stringify(founder), /\d{4}|billions?|millions?/i);
  });

  it("keeps the introduction concise and connects expertise with the publication", () => {
    const copy = `${founder.lead} ${founder.bio}`;
    assert.ok(copy.split(/\s+/).length < 80);
    for (const topic of ["storage", "streaming", "logistics", "advertising", "System Craft Lab", "system design", "AI fundamentals"])
      assert.ok(copy.includes(topic), topic);
    assert.doesNotMatch(copy, /[\u3400-\u9fff]|leverag\w*|revolution\w*|game-changing/i);
  });

  it("ships the supplied portrait locally as a small JPEG", () => {
    assert.equal(founder.portrait, "/images/yao-xiao.jpg");
    const portrait = readFileSync(new URL(`../public${founder.portrait}`, import.meta.url));
    assert.equal(portrait.readUInt16BE(0), 0xffd8);
    assert.equal(portrait.readUInt16BE(portrait.length - 2), 0xffd9);
    assert.ok(portrait.length < 100_000);
  });
});
