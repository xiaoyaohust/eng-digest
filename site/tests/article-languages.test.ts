import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articleLanguagePath, articleRouteLanguage } from "../src/lib/articleLanguages.ts";
import { wrapLocalizedText } from "../scripts/lib/social-card-text.mjs";

describe("static article language URLs", () => {
  it("round trips both languages without doubling a locale or losing a deployment base", () => {
    for (const base of ["/", "/eng-digest/"]) {
      const primary = `${base}personal/china-history/example/`;
      const chinese = `${base}zh/personal/china-history/example/`;
      assert.equal(articleLanguagePath(primary, "zh-CN", "en", base), chinese);
      assert.equal(articleLanguagePath(chinese, "zh-CN", "en", base), chinese);
      assert.equal(articleLanguagePath(chinese, "en", "en", base), primary);
      assert.equal(articleRouteLanguage(primary, "en", base), "en");
      assert.equal(articleRouteLanguage(chinese, "en", base), "zh-CN");
    }
  });

  it("also supports an English translation of a Chinese primary article", () => {
    assert.equal(articleLanguagePath("/personal/china-history/example/", "en", "zh-CN"), "/en/personal/china-history/example/");
    assert.equal(articleLanguagePath("/en/personal/china-history/example/", "zh-CN", "zh-CN"), "/personal/china-history/example/");
    assert.equal(articleRouteLanguage("/en/personal/china-history/example/", "zh-CN"), "en");
  });
});

describe("Chinese share card wrapping", () => {
  it("wraps text without spaces and preserves every code point when no truncation is needed", () => {
    const text = "土层、年代与环境：怎样读懂史前中国留下的证据";
    const lines = wrapLocalizedText(text, 36, 3);
    assert.ok(lines.length > 1);
    assert.equal(lines.join(""), text);
    assert.ok(lines.every((line: string) => [...line].length <= 18));
  });

  it("bounds mixed Latin and Chinese text and signals truncation", () => {
    const lines = wrapLocalizedText("AI " + "人工智能基础".repeat(30), 36, 3);
    assert.equal(lines.length, 3);
    assert.ok(lines[2].endsWith("…"));
    assert.deepEqual(wrapLocalizedText("", 36, 3), []);
  });
});
