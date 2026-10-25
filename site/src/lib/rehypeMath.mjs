import katex from "katex";
import { fromHtml } from "hast-util-from-html";
import { toText } from "hast-util-to-text";
import { visit } from "unist-util-visit";

/** Render explicit LaTeX math fences at build time, without parsing prices. */
export default function rehypeMath() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children.find((child) => child.type === "element");
      if (code?.tagName !== "code" || !(code.properties.className ?? []).includes("language-math")) return;
      const markup = katex.renderToString(toText(code, { whitespace: "pre" }).trim(), {
        displayMode: true,
        output: "htmlAndMathml",
        trust: false,
        strict: "error",
        throwOnError: true,
        maxExpand: 1000,
        maxSize: 10,
      });
      parent.children.splice(index, 1, ...fromHtml(markup, { fragment: true }).children);
    });
  };
}
