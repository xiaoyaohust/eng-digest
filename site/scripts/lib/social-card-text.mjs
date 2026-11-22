/** CJK text has no spaces between words and needs roughly twice the width. */
export function wrapLocalizedText(text, limit, maxLines) {
  const units = char => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]/u.test(char) ? 2 : 1;
  const lines = [];
  let line = "", width = 0;
  for (const char of String(text ?? "").replace(/\s+/g, " ").trim()) {
    const size = units(char);
    if (width + size > limit && line) {
      lines.push(line.trimEnd()); line = ""; width = 0;
    }
    if (!line && char === " ") continue;
    line += char; width += size;
  }
  if (line) lines.push(line.trimEnd());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = Array.from(lines[maxLines - 1]).slice(0, -1).join("") + "…";
  }
  return lines;
}
