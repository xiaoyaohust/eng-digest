import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCLS } from "../tests-e2e/helpers/performance.ts";

describe("CLS regression metric", () => {
  it("counts the worst session and ignores shifts after recent user input", () => {
    assert.equal(calculateCLS([]), 0);
    assert.equal(calculateCLS([
      { startTime: 300, value: 0.02, hadRecentInput: false },
      { startTime: 700, value: 1, hadRecentInput: true },
      { startTime: 900, value: 0.03, hadRecentInput: false },
      { startTime: 2000, value: 0.04, hadRecentInput: false },
    ]), 0.05);
  });

  it("starts a new window at a one-second gap or five seconds of continuous shifts", () => {
    assert.equal(calculateCLS([
      { startTime: 1000, value: 0.1, hadRecentInput: false },
      { startTime: 2000, value: 0.2, hadRecentInput: false },
    ]), 0.2);
    const continuous = Array.from({ length: 8 }, (_, index) => ({ startTime: 500 + index * 900, value: 0.125, hadRecentInput: false }));
    assert.equal(calculateCLS(continuous), 0.75);
  });
});
