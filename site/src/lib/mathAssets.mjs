import katex from "katex";

// A versioned, self-hosted directory keeps KaTeX's relative font URLs intact.
// This module is used only at build time; it sends no KaTeX JavaScript to clients.
export const mathAssetDirectory = `vendor/katex/${katex.version}`;
export const mathStylesheetPath = `/${mathAssetDirectory}/katex.min.css`;
