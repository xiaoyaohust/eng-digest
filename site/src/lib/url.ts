/**
 * Prefix an absolute internal path with the configured base path
 * (import.meta.env.BASE_URL, driven by astro.config.mjs's BASE_PATH env
 * var) so links keep working under a GitHub Pages project-site base today
 * and a custom domain (base "/") later, with no component changes.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    // Frontmatter dates are calendar dates, parsed as midnight UTC. Without
    // this, users west of UTC see the previous day (for example 09-15 as 09-14).
    timeZone: "UTC",
  });
}

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Rough reading time estimate from raw Markdown/MDX body text. */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
