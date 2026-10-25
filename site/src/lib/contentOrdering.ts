interface DatedEntry {
  id: string;
  data: { date: Date };
}

/** Publication date controls freshness; editing an old article does not move it.
 * Same-date entries use a stable ID tie-breaker rather than filesystem order. */
export function newestFirst<T extends DatedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) =>
    b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id));
}

/** Newest article determines each group's position. Input order is irrelevant;
 * group names break same-date ties, and articles within each group are newest first. */
export function groupByLatestArticle<T extends DatedEntry, K extends string>(
  entries: readonly T[],
  groupKey: (entry: T) => K,
): [K, T[]][] {
  const groups = new Map<K, T[]>();
  for (const entry of newestFirst(entries)) {
    const key = groupKey(entry);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups].sort(([keyA, a], [keyB, b]) =>
    b[0].data.date.valueOf() - a[0].data.date.valueOf() || keyA.localeCompare(keyB));
}
