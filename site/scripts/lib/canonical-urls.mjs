import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";

/** Validate generated markup, without rewriting editorial links or redirects. */
export function checkPageURLs(html, expectedURL, siteURL) {
  const errors = [];
  const elements = [];
  visit(fromHtml(html), "element", (node) => { elements.push(node); });
  const site = new URL(siteURL);
  const canonicals = elements.filter((node) => node.tagName === "link" && node.properties.rel?.includes("canonical"));
  if (canonicals.length !== 1) return ["expected exactly one canonical link"];

  const refresh = elements.find((node) => node.tagName === "meta" && String(node.properties.httpEquiv).toLowerCase() === "refresh");
  const destination = String(refresh?.properties.content ?? "").match(/^\s*0\s*;\s*url\s*=\s*(.+)$/i)?.[1];
  // Astro's static /interviews/ alias must keep pointing at its replacement.
  const expected = new URL(destination || expectedURL, expectedURL);
  const canonical = String(canonicals[0].properties.href);
  if (canonical !== expected.href) errors.push(`canonical ${canonical} should be ${expected.href}`);
  if (expected.origin !== site.origin) errors.push("canonical/redirect destination is outside SITE_URL");

  for (const node of elements) {
    const props = node.properties;
    if (node.tagName === "meta" && props.property === "og:url" && props.content !== canonical) {
      errors.push("og:url does not match canonical");
    }
    const share = node.tagName === "a" && String(props.href).startsWith("https://www.linkedin.com/sharing/share-offsite/");
    if (share && new URL(props.href).searchParams.get("url") !== canonical) errors.push("LinkedIn share URL does not match canonical");
    if (props.dataCopyValue && props.dataCopyValue !== canonical) errors.push("Copy link URL does not match canonical");

    for (const attribute of ["href", "src"]) {
      const value = props[attribute];
      if (typeof value !== "string" || /^(?:#|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
      let url;
      try { url = new URL(value, expectedURL); } catch { errors.push(`invalid ${attribute}: ${value}`); continue; }
      const legacy = url.hostname === "xiaoyaohust.github.io" && /^\/eng-digest(?:\/|$)/.test(url.pathname) && url.origin !== site.origin;
      const sameHost = url.hostname.replace(/^www\./, "") === site.hostname.replace(/^www\./, "");
      if (legacy || (sameHost && url.origin !== site.origin)) {
        errors.push(`noncanonical site URL: ${value}`);
      }
      if (url.origin !== site.origin) continue;
      const base = site.pathname.replace(/\/$/, "");
      if (base && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) errors.push(`URL outside site base: ${value}`);
      const lastSegment = url.pathname.split("/").pop() ?? "";
      if (lastSegment && !lastSegment.includes(".")) errors.push(`page URL needs a trailing slash: ${value}`);
      if (url.pathname === `${base}/interviews/`) errors.push(`link uses retired interview route: ${value}`);
    }
  }
  return errors;
}
