import { getCollection, type CollectionEntry } from "astro:content";

/** Non-draft entries, newest first. Draft filtering happens once, here,
 * so no page template has to remember to do it itself. */
export async function published<C extends "system-design" | "coding" | "interviews">(
  collection: C
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedDigests() {
  const entries = await getCollection("generated-digests");
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedWeeklyDigests() {
  const entries = await getCollection("generated-weekly");
  return entries.sort((a, b) => b.data.weekStart.valueOf() - a.data.weekStart.valueOf());
}

interface RelatedCandidate {
  slug: string;
  href: string;
  title: string;
  kicker: string;
  tags: string[];
}

/** Flattened, cross-collection candidate list for "Related" lookups. */
export async function allCandidates(): Promise<RelatedCandidate[]> {
  const [systemDesign, coding, interviews] = await Promise.all([
    published("system-design"),
    published("coding"),
    published("interviews"),
  ]);

  return [
    ...systemDesign.map((e) => ({
      slug: e.id,
      href: `/system-design/${e.id}/`,
      title: e.data.title,
      kicker: "System Design",
      tags: e.data.tags,
    })),
    ...coding.map((e) => ({
      slug: e.id,
      href: `/coding/${e.id}/`,
      title: e.data.title,
      kicker: "Coding",
      tags: e.data.tags,
    })),
    ...interviews.map((e) => ({
      slug: e.id,
      href: `/interviews/${e.id}/`,
      title: e.data.title,
      kicker: "Interview",
      tags: e.data.tags,
    })),
  ];
}

/** Up to `limit` entries (any section) sharing the most tags with `tags`. */
export function findRelated(
  tags: string[],
  candidates: RelatedCandidate[],
  currentHref: string,
  limit = 3
) {
  const tagSet = new Set(tags);
  return candidates
    .filter((c) => c.href !== currentHref)
    .map((c) => ({
      ...c,
      overlap: c.tags.filter((t) => tagSet.has(t)).length,
    }))
    .filter((c) => c.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
}
