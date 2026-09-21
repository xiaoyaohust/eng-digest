import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginationItems } from "../src/lib/pagination.ts";

describe("digest pagination", () => {
  it("shows the first window and last page", () => {
    assert.deepEqual(paginationItems(1, 13), [1, 2, 3, "gap", 13]);
  });

  it("shows both gaps around a middle page", () => {
    assert.deepEqual(paginationItems(7, 13), [1, "gap", 5, 6, 7, 8, 9, "gap", 13]);
  });

  it("shows the final window without duplicates", () => {
    assert.deepEqual(paginationItems(13, 13), [1, "gap", 11, 12, 13]);
  });

  it("rejects impossible page state", () => {
    assert.deepEqual(paginationItems(0, 13), []);
    assert.deepEqual(paginationItems(14, 13), []);
  });
});
