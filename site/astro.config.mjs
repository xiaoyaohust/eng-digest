import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// SITE_URL / BASE_PATH let deployment target change (GitHub Pages project
// site today, a custom domain later) without touching any component code.
// Defaults match the current GitHub Pages project-site URL for this repo.
const siteUrl = process.env.SITE_URL || "https://xiaoyaohust.github.io";
const basePath = process.env.BASE_PATH ?? "/eng-digest";

export default defineConfig({
  site: siteUrl,
  base: basePath,
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: true,
    },
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
    ],
  },
});
