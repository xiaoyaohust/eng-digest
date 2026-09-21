export type PracticeRating = "know" | "unsure" | "review";

export interface PracticeQuestionData {
  question: string;
  hint: string;
  answer: string;
  topic?: string;
}

export interface SavedPracticeState {
  signature: string;
  ratings: Record<string, PracticeRating>;
  favorites: string[];
  order: string[];
}

export interface PracticeQuestionRecord extends PracticeQuestionData {
  id: string;
}

const ratings = new Set<PracticeRating>(["know", "unsure", "review"]);

/** Small deterministic hash suitable for local state identity, not security. */
export function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function practiceSignature(questions: PracticeQuestionData[]): string {
  return stableHash(JSON.stringify(questions));
}

export function buildPracticeQuestionRecords(questions: PracticeQuestionData[]): PracticeQuestionRecord[] {
  const occurrences = new Map<string, number>();
  return questions.map((question) => {
    const base = stableHash(JSON.stringify(question));
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return { ...question, id: occurrence === 0 ? base : `${base}-${occurrence}` };
  });
}

export function makeDefaultPracticeState(questionIds: string[], signature: string): SavedPracticeState {
  return { signature, ratings: {}, favorites: [], order: [...questionIds] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExactQuestionOrder(value: unknown, questionIds: string[]): value is string[] {
  if (!Array.isArray(value) || value.length !== questionIds.length || !value.every((item) => typeof item === "string")) return false;
  const expected = new Set(questionIds);
  return new Set(value).size === expected.size && value.every((item) => expected.has(item));
}

/** Parse and validate browser state. Invalid or stale state is discarded atomically. */
export function parsePracticeState(raw: string | null, questionIds: string[], signature: string): SavedPracticeState {
  const fallback = makeDefaultPracticeState(questionIds, signature);
  if (!raw) return fallback;

  try {
    const candidate: unknown = JSON.parse(raw);
    if (!isRecord(candidate) || candidate.signature !== signature) return fallback;
    if (!isExactQuestionOrder(candidate.order, questionIds)) return fallback;
    if (!Array.isArray(candidate.favorites) || !candidate.favorites.every((item) => typeof item === "string" && questionIds.includes(item))) return fallback;
    if (!isRecord(candidate.ratings)) return fallback;

    const validRatings: Record<string, PracticeRating> = {};
    for (const [questionId, rating] of Object.entries(candidate.ratings)) {
      if (!questionIds.includes(questionId) || typeof rating !== "string" || !ratings.has(rating as PracticeRating)) return fallback;
      validRatings[questionId] = rating as PracticeRating;
    }

    return {
      signature,
      order: [...candidate.order],
      favorites: [...new Set(candidate.favorites)],
      ratings: validRatings,
    };
  } catch {
    return fallback;
  }
}

export function shuffleOrder<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const order = [...values];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [order[index], order[swapWith]] = [order[swapWith], order[index]];
  }
  return order;
}
