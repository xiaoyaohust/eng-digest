export const SCIENCE_SECTION_NAME = "Computing for Science";

// Add project names here and use the corresponding ID in article frontmatter.
export const scienceProjectIds = ["eclipse-atlas"] as const;
export type ScienceProjectId = (typeof scienceProjectIds)[number];

export const scienceProjects: Record<ScienceProjectId, {
  name: string;
  subtitle: string;
  description: string;
  discipline: string;
}> = {
  "eclipse-atlas": {
    name: "Eclipse Atlas",
    subtitle: "Stellar timing with Python",
    description: "A Python research pipeline for public telescope data, eclipse timing, physical models, and uncertainty calibration.",
    discipline: "ASTROPHYSICS",
  },
};

export function scienceArticleHref(entry: { id: string; data: { project: ScienceProjectId } }): string {
  return `/science/${entry.data.project}/${entry.id}/`;
}
