import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// SITE_URL / BASE_PATH let the deployment target change without touching any
// component code. Defaults match the live custom domain, which serves the site
// from the root — so the base path is "/", not "/eng-digest".
//
// These two must stay in sync with where the site is actually served. When the
// site moved from the github.io project site to systemcraftlab.com but the base
// stayed "/eng-digest", every asset was emitted as /eng-digest/_astro/….css and
// 404'd on the new domain, so the whole site rendered as unstyled HTML.
// site/scripts/check-internal-links.mjs defaults to the same base.
const siteUrl = process.env.SITE_URL || "https://systemcraftlab.com";
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site: siteUrl,
  base: basePath,
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: unified({
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
      ],
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: true,
    },
  },
});
