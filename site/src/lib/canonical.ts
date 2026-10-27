/** One query-free, fragment-free URL for metadata and article sharing. */
export function canonicalPageURL(pathname: string, site: URL | string | undefined): URL {
  if (!site) throw new Error("Astro site must be configured for canonical URLs");
  const url = new URL(pathname, site);
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/") && !url.pathname.split("/").pop()?.includes(".")) {
    url.pathname += "/";
  }
  return url;
}
