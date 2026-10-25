import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentSections, sectionCode } from "../src/data/contentSections.ts";
import { newestFirst, groupByLatestArticle } from "../src/lib/contentOrdering.ts";
import { orderAIArticles } from "../src/data/ai.ts";

const entry = (id: string, topic: string, date: string, order = 1) =>
  ({ id, data: { topic, date: new Date(date), order } });

describe("content listing order", () => {
  it("keeps the six content sections in editorial order and numbers modules in that order", () => {
    assert.deepEqual(contentSections.map((section) => section.id), [
      "system-design", "ai", "field-notes", "eng-digest", "science", "coding",
    ]);
    assert.equal(new Set(contentSections.map((section) => section.href)).size, 6);
    assert.deepEqual(contentSections.map((section) => sectionCode(section.id)), ["01", "02", "03", "04", "05", "06"]);
  });

  it("sorts by publication time without changing input or using updated dates", () => {
    const originalOld = entry("old", "A", "2026-10-01");
    const old = { ...originalOld, data: { ...originalOld.data, updated: new Date("2026-12-01") } };
    const entries = [old, entry("new", "A", "2026-10-25"), entry("middle", "B", "2026-10-20")];
    const original = [...entries];
    assert.deepEqual(newestFirst(entries).map((item) => item.id), ["new", "middle", "old"]);
    assert.deepEqual(entries, original);
  });

  it("moves the group with the newest article ahead, including when most of its articles are old", () => {
    const entries = [
      entry("old-a", "A", "2020-01-01"),
      entry("middle-b", "B", "2026-10-20"),
      entry("old-b", "B", "2026-10-19"),
      entry("new-a", "A", "2026-10-25"),
    ];
    assert.deepEqual(groupByLatestArticle(entries, (item) => item.data.topic).map(([key, items]) =>
      [key, items.map((item) => item.id)]), [["A", ["new-a", "old-a"]], ["B", ["middle-b", "old-b"]]]);
    const added = [...entries, entry("new-b", "B", "2026-10-26")];
    assert.equal(groupByLatestArticle(added, (item) => item.data.topic)[0][0], "B");
    assert.equal(entries[0].id, "old-a");
  });

  it("supports science project IDs and manually named topics without predefined categories", () => {
    const entries = [entry("one", "older-project", "2026-10-01"), entry("two", "new-project", "2026-10-25")];
    assert.deepEqual(groupByLatestArticle(entries, (item) => item.data.topic).map(([key]) => key), ["new-project", "older-project"]);
    const topics = [entry("x", "__proto__", "2026-10-01"), entry("y", "Computer Networking Fundamentals", "2026-10-25")];
    assert.equal(groupByLatestArticle(topics, (item) => item.data.topic).length, 2);
  });

  it("resolves equal dates deterministically and respects timestamps within a day", () => {
    const entries = [entry("z", "Beta", "2026-10-25"), entry("b", "Alpha", "2026-10-25"), entry("a", "Alpha", "2026-10-25")];
    const expected = [["Alpha", ["a", "b"]], ["Beta", ["z"]]];
    for (const input of [entries, [...entries].reverse()]) {
      assert.deepEqual(groupByLatestArticle(input, (item) => item.data.topic).map(([key, items]) =>
        [key, items.map((item) => item.id)]), expected);
    }
    const timed = [entry("early", "A", "2026-10-25T09:00:00Z"), entry("late", "B", "2026-10-25T17:00:00Z")];
    assert.equal(newestFirst(timed)[0].id, "late");
    assert.equal(groupByLatestArticle(timed, (item) => item.data.topic)[0][0], "B");
  });

  it("handles empty and single-entry collections without inventing empty groups", () => {
    assert.deepEqual(newestFirst([]), []);
    assert.deepEqual(groupByLatestArticle([], () => "unused"), []);
    const item = entry("only", "A", "2026-10-25");
    assert.deepEqual(groupByLatestArticle([item], (value) => value.data.topic), [["A", [item]]]);
  });

  it("keeps AI discovery newest-first and teaching navigation in editorial order", () => {
    const entries = [entry("first-lesson", "Basics", "2026-10-24", 1), entry("second-lesson", "Basics", "2026-10-25", 2)];
    assert.deepEqual(newestFirst(entries).map((item) => item.id), ["second-lesson", "first-lesson"]);
    assert.deepEqual(orderAIArticles(entries).map((item) => item.id), ["first-lesson", "second-lesson"]);
  });
});
