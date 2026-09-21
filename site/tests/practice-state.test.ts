import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPracticeQuestionRecords,
  makeDefaultPracticeState,
  parsePracticeState,
  practiceSignature,
  shuffleOrder,
  type PracticeQuestionData,
} from "../src/lib/practiceState.ts";

const questions: PracticeQuestionData[] = [
  { question:"Question A", hint:"Hint A", answer:"Answer A", topic:"Storage" },
  { question:"Question B", hint:"Hint B", answer:"Answer B", topic:"Queues" },
];

describe("practice state", () => {
  it("uses content-derived IDs and invalidates state when questions are reordered", () => {
    const ids = buildPracticeQuestionRecords(questions).map((question) => question.id);
    const signature = practiceSignature(questions);
    const saved = makeDefaultPracticeState(ids, signature);
    saved.ratings[ids[0]] = "know";

    assert.equal(parsePracticeState(JSON.stringify(saved), ids, signature).ratings[ids[0]], "know");
    const reorderedSignature = practiceSignature([...questions].reverse());
    assert.deepEqual(parsePracticeState(JSON.stringify(saved), [...ids].reverse(), reorderedSignature).ratings, {});
  });

  it("invalidates state when question content changes without changing the count", () => {
    const ids = buildPracticeQuestionRecords(questions).map((question) => question.id);
    const saved = makeDefaultPracticeState(ids, practiceSignature(questions));
    const edited = [{ ...questions[0], answer:"Changed answer" }, questions[1]];
    const editedIds = buildPracticeQuestionRecords(edited).map((question) => question.id);

    assert.deepEqual(parsePracticeState(JSON.stringify(saved), editedIds, practiceSignature(edited)),
      makeDefaultPracticeState(editedIds, practiceSignature(edited)),
    );
  });

  it("falls back safely for malformed but valid JSON", () => {
    const ids = buildPracticeQuestionRecords(questions).map((question) => question.id);
    const signature = practiceSignature(questions);
    const malformed = JSON.stringify({ signature, order:ids, favorites:null, ratings:{ [ids[0]]:"know" } });
    assert.deepEqual(parsePracticeState(malformed, ids, signature), makeDefaultPracticeState(ids, signature));
  });

  it("produces a permutation without mutating the source order", () => {
    const source = ["a", "b", "c", "d"];
    const shuffled = shuffleOrder(source, () => 0);
    assert.deepEqual(source, ["a", "b", "c", "d"]);
    assert.notDeepEqual(shuffled, source);
    assert.deepEqual([...shuffled].sort(), [...source].sort());
  });
});
