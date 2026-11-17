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
    subtitle: "中国通史",
    description: "Notes on Chinese history from early civilization to the modern era, dynasty by dynasty.",
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
