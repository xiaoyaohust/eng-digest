export const AI_SECTION_NAME = "AI Foundations";
export const AI_SECTION_DESCRIPTION =
  "Learn artificial intelligence through clear explanations, small experiments, and exercises, from first principles to models and agents.";

export function aiArticleHref(entry: { id: string }): string {
  return `/ai/${entry.id}/`;
}

/** Encoding the full name keeps topic anchors stable when publication order changes. */
export function aiTopicId(topic: string): string {
  return `ai-topic-${encodeURIComponent(topic)}`;
}

/** Reading order is editorial, independent of the date an article was added. */
export function orderAIArticles<T extends { data: { order: number; date: Date }; id: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
