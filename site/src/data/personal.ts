export const PERSONAL_SECTION_NAME = "Personal Interest";
export const PERSONAL_SECTION_DESCRIPTION =
  "History, languages, and travel: reading notes and essays from outside engineering work.";

// Add a category here, then use its ID as `category` in article frontmatter.
// Display order on the section page follows this list.
export const personalCategoryIds = ["china-history", "history-talks", "spanish", "travel"] as const;
export type PersonalCategoryId = (typeof personalCategoryIds)[number];

export const personalCategories: Record<PersonalCategoryId, {
  name: string;
  subtitle: string;
  description: string;
  label: string;
}> = {
  "china-history": {
    name: "A General History of China",
    subtitle: "Evidence, people, and historical change",
    description: "Chinese history through focused essays on archaeological evidence, people, institutions, and social change.",
    label: "HISTORY / CHINA",
  },
  "history-talks": {
    name: "History Talks",
    subtitle: "Essays on the past",
    description: "Essays on people, events, and turning points from world history.",
    label: "HISTORY / ESSAYS",
  },
  spanish: {
    name: "Spanish Learning",
    subtitle: "Aprendiendo español",
    description: "Grammar, vocabulary, and practice notes from learning Spanish.",
    label: "LANGUAGE / SPANISH",
  },
  travel: {
    name: "Travel Blog",
    subtitle: "Places and journeys",
    description: "Trip notes, routes, and impressions from places visited.",
    label: "TRAVEL / JOURNAL",
  },
};

export function personalArticleHref(entry: { id: string; data: { category: PersonalCategoryId } }): string {
  return `/personal/${entry.data.category}/${entry.id}/`;
}

/** Keep manually named chapter anchors stable when newer articles are added. */
export function personalTopicId(topic: string): string {
  // Preserve the chapter anchor published before its display name became English.
  const originalName = topic === "Chapter 1: The Natural Environment and Archaeological Evidence of Prehistoric China"
    ? "第一章 史前中国的自然环境与考古学证据" : topic;
  return `personal-topic-${encodeURIComponent(originalName)}`;
}
