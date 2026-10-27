import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalPageURL } from "../src/lib/canonical.ts";
import { checkPageURLs } from "../scripts/lib/canonical-urls.mjs";

const site = "https://systemcraftlab.com/";
const url = `${site}ai/example/`;
const page = (extra = "", canonical = url) => `<!doctype html><html><head>
  <link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}">
  </head><body>${extra}</body></html>`;

describe("canonical URL regression checks", () => {
  it("centralizes article URLs without tracking parameters or fragments", () => {
    assert.equal(canonicalPageURL("/ai/example?utm_source=linkedin#exercise", site).href, url);
    assert.equal(canonicalPageURL("/eng-digest/ai/example/", site).href, `${site}eng-digest/ai/example/`);
    assert.equal(canonicalPageURL("/rss.xml", site).href, `${site}rss.xml`);
    assert.throws(() => canonicalPageURL("/", undefined));
  });

  it("accepts canonical links, sharing, assets, fragments, and external references", () => {
    assert.deepEqual(checkPageURLs(page(`
      <a href="/ai/">AI</a><a href="#exercise">Exercise</a>
      <link rel="stylesheet" href="/vendor/katex/0.19.1/katex.min.css">
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">Share</a>
      <button data-copy-value="${url}">Copy</button>
      <a href="https://example.com/reference">Reference</a>`), url, site), []);
  });

  it("rejects HTTP, www, old project URLs, missing slashes, and retired internal links", () => {
    for (const href of ["http://systemcraftlab.com/ai/", "https://www.systemcraftlab.com/ai/", "https://xiaoyaohust.github.io/eng-digest/ai/", "/ai", "/interviews/"]) {
      assert.ok(checkPageURLs(page(`<a href="${href}">Read</a>`), url, site).length, href);
    }
    assert.ok(checkPageURLs(page("", `${site}ai/wrong/`), url, site).some((error: string) => error.startsWith("canonical")));
  });

  it("rejects stale LinkedIn, Copy link, and Open Graph destinations", () => {
    assert.ok(checkPageURLs(page('<a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fsystemcraftlab.com%2F">Share</a>'), url, site).some((error: string) => error.includes("LinkedIn")));
    assert.ok(checkPageURLs(page(`<button data-copy-value="${site}">Copy</button>`), url, site).some((error: string) => error.includes("Copy link")));
    assert.ok(checkPageURLs(page().replace(`content="${url}"`, `content="${site}"`), url, site).some((error: string) => error.includes("og:url")));
  });

  it("preserves the static interview redirect and supports project-site base paths", () => {
    const redirect = '<meta http-equiv="refresh" content="0;url=/field-notes/"><link rel="canonical" href="https://systemcraftlab.com/field-notes/"><a href="/field-notes/">Continue</a>';
    assert.deepEqual(checkPageURLs(redirect, `${site}interviews/`, site), []);
    const base = `${site}project/`;
    const articleURL = `${base}ai/example/`;
    assert.deepEqual(checkPageURLs(page('<a href="/project/ai/">AI</a>', articleURL), articleURL, base), []);
    assert.ok(checkPageURLs(page('<a href="/ai/">AI</a>', articleURL), articleURL, base).some((error: string) => error.includes("outside site base")));
    const projectSite = "https://xiaoyaohust.github.io/eng-digest/";
    const projectArticle = `${projectSite}ai/example/`;
    assert.deepEqual(checkPageURLs(page('<a href="/eng-digest/ai/">AI</a>', projectArticle), projectArticle, projectSite), []);
  });
});
