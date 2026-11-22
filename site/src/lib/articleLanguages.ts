export type ArticleLanguage = "en" | "zh-CN";

/** Keep the deployment base while giving each translated HTML file its own URL. */
export function articleLanguagePath(pathname: string, language: ArticleLanguage, primary: ArticleLanguage = "en", base = "/"): string {
  const prefix = base.replace(/\/$/, "");
  const relative = prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
  const original = relative.replace(/^\/(?:zh|en)\//, "/");
  return `${prefix}${language === primary ? "" : language === "zh-CN" ? "/zh" : "/en"}${original}`;
}

export function articleRouteLanguage(pathname: string, primary: ArticleLanguage, base = "/"): ArticleLanguage {
  const prefix = base.replace(/\/$/, "");
  const relative = prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
  return relative.startsWith("/zh/") ? "zh-CN" : relative.startsWith("/en/") ? "en" : primary;
}
