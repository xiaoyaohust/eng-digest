export interface ArticleLanguageOption {
  lang: string;
  title: string;
  description: string;
  url: string;
  image?: string;
}

export function readArticleLanguages(): ArticleLanguageOption[] {
  const config = document.querySelector<HTMLElement>("[data-article-langs]");
  return JSON.parse(config?.dataset.languageOptions ?? "[]");
}

/** Update the current view; crawlers receive the same values in static HTML. */
export function setArticleShareLanguage(option: ArticleLanguageOption): void {
  const set = (selector: string, value: string) => document.querySelector(selector)?.setAttribute("content", value);
  document.title = `${option.title} · Eng Knowledge`;
  set('meta[name="description"]', option.description);
  set('meta[property="og:title"]', document.title);
  set('meta[property="og:description"]', option.description);
  set('meta[property="og:locale"]', option.lang === "zh-CN" ? "zh_CN" : "en_US");
  set('meta[property="og:locale:alternate"]', option.lang === "zh-CN" ? "en_US" : "zh_CN");
  set('meta[property="og:url"]', option.url);
  set('meta[name="twitter:title"]', document.title);
  set('meta[name="twitter:description"]', option.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", option.url);
  if (option.image) {
    for (const selector of ['meta[property="og:image"]', 'meta[property="og:image:secure_url"]', 'meta[name="twitter:image"]']) set(selector, option.image);
    set('meta[property="og:image:alt"]', option.title);
    set('meta[name="twitter:image:alt"]', option.title);
  }
  const schema = document.querySelector('script[type="application/ld+json"]');
  if (schema?.textContent) {
    const schemas = JSON.parse(schema.textContent);
    for (const item of schemas) {
      if (item["@type"] === "Article") Object.assign(item, { headline: option.title, description: option.description, inLanguage: option.lang,
        mainEntityOfPage: { "@type": "WebPage", "@id": option.url }, ...(option.image ? { image: [option.image] } : {}) });
      if (item["@type"] === "BreadcrumbList" && item.itemListElement?.length) Object.assign(item.itemListElement.at(-1), { name: option.title, item: option.url });
    }
    schema.textContent = JSON.stringify(schemas).replace(/</g, "\\u003c");
  }
  const current = new URL(location.href);
  const next = new URL(option.url);
  for (const [key, value] of current.searchParams) if (key !== "lang") next.searchParams.append(key, value);
  next.hash = current.hash;
  // Use the current deployment origin for local preview and alternate hosting.
  history.replaceState(history.state, "", `${next.pathname}${next.search}${next.hash}`);
  document.dispatchEvent(new CustomEvent("article-language-change"));
}
