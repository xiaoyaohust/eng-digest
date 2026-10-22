// Render ```mermaid blocks to inline SVG at build time, so article pages ship
// no Mermaid JavaScript. Mermaid needs a real DOM to measure text, so
// mermaid-isomorphic drives a headless Chromium through Playwright (the same
// browser the e2e suite installs).
//
// Each diagram is rendered twice, once per site theme, and both SVGs go into
// one .mermaid-diagram container; global.css shows the one matching the
// current theme, so the theme toggle switches diagrams without re-rendering.
//
// Shiki must skip mermaid (markdown.syntaxHighlight.excludeLangs) so the block
// reaches this plugin as a plain <pre><code class="language-mermaid">.
import { createHash } from "node:crypto";
import { fromHtml } from "hast-util-from-html";
import { toText } from "hast-util-to-text";
import { createMermaidRenderer } from "mermaid-isomorphic";
import { visit } from "unist-util-visit";

// Arial and Liberation Sans share metrics, so labels measured in CI's Linux
// Chromium (which ships Liberation) fit the boxes drawn around them when the
// diagram is viewed on macOS or Windows (which ship Arial).
const fontFamily = 'arial, "Liberation Sans", sans-serif';

const themes = [
  { name: "light", mermaidTheme: "default" },
  { name: "dark", mermaidTheme: "dark" },
];

// Mermaid's default max-width shrinks large diagrams until labels are
// unreadable. Keep a useful scale and let the container scroll instead.
const maxDiagramWidth = 1800;
const diagramScale = 0.75;

let renderer;

function isMermaidBlock(node) {
  if (node.type !== "element" || node.tagName !== "pre") return false;
  const code = node.children.find((child) => child.type === "element");
  return code?.tagName === "code" &&
    (code.properties.className ?? []).includes("language-mermaid");
}

function toSvgNode(svg, theme, fallbackWidth) {
  const node = fromHtml(svg, { fragment: true }).children.find(
    (child) => child.type === "element" && child.tagName === "svg"
  );
  if (!node) throw new Error("Mermaid output contained no <svg> element");
  // HTML labels live in <foreignObject>, but the serializer stays in SVG mode
  // there and writes <br> as <br></br>; browsers read the stray </br> as a
  // second break, which pushes the label's last line out of its box. An
  // empty block-level span breaks the line the same way and survives.
  visit(node, "element", (child) => {
    if (child.tagName !== "br") return;
    child.tagName = "span";
    child.properties = { style: "display: block;" };
  });
  const viewBoxWidth = Number(String(node.properties.viewBox ?? "").split(/\s+/)[2]);
  const naturalWidth = viewBoxWidth || fallbackWidth;
  const width = Math.min(maxDiagramWidth, Math.ceil(naturalWidth * diagramScale));
  node.properties.className = [...(node.properties.className ?? []), `mermaid-${theme}`];
  node.properties.style = `max-width: none; width: max(100%, ${width}px); height: auto;`;
  return node;
}

export default function rehypeMermaid() {
  return async (tree, file) => {
    const blocks = [];
    visit(tree, "element", (node, index, parent) => {
      if (!isMermaidBlock(node) || !parent || index === undefined) return;
      blocks.push({ node, parent, source: toText(node, { whitespace: "pre" }).trim() });
    });
    if (blocks.length === 0) return;

    renderer ??= createMermaidRenderer();
    const sources = blocks.map((block) => block.source);
    // SVG ids must be unique per page, and Mermaid scopes each diagram's
    // inline <style> by id, so a reused id would restyle another diagram.
    const pageKey = createHash("sha1").update(sources.join("\0")).digest("hex").slice(0, 8);
    const rendered = await Promise.all(
      themes.map(({ name, mermaidTheme }) =>
        renderer(sources, {
          prefix: `mermaid-${pageKey}-${name}`,
          mermaidConfig: { theme: mermaidTheme, fontFamily },
        })
      )
    );

    blocks.forEach((block, i) => {
      const svgs = themes.map(({ name }, t) => {
        const result = rendered[t][i];
        if (result.status === "rejected") {
          throw new Error(
            `${file.path ?? "markdown"}: Mermaid diagram ${i + 1} (${name} theme) failed to render: ${result.reason}`
          );
        }
        return toSvgNode(result.value.svg, name, result.value.width);
      });
      const container = {
        type: "element",
        tagName: "div",
        properties: {
          className: ["mermaid-diagram"],
          tabIndex: 0,
          role: "group",
          ariaLabel: "Architecture diagram, scroll horizontally to explore",
        },
        children: svgs,
      };
      block.parent.children.splice(block.parent.children.indexOf(block.node), 1, container);
    });
  };
}
