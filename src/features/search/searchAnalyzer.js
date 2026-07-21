const TOKEN_PATTERN = /[\p{L}\p{N}\p{M}]+/gu;
const SINGLE_QUOTE_PATTERN = /[‘’‚‛′`´]/gu;
const DOUBLE_QUOTE_PATTERN = /[“”„‟«»]/gu;

export function normalizeSearchText(value) {
  return String(value ?? "")
    .replace(SINGLE_QUOTE_PATTERN, "'")
    .replace(DOUBLE_QUOTE_PATTERN, '"')
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replaceAll("ı", "i")
    .replace(/\s+/gu, " ")
    .trim();
}

export function tokenizeSearchText(value) {
  const source = String(value ?? "");
  const tokens = [];

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const normalized = normalizeSearchText(match[0]);
    if (!normalized) {
      continue;
    }
    tokens.push({
      value: normalized,
      start: match.index,
      end: match.index + match[0].length,
      position: tokens.length
    });
  }
  return tokens;
}

export function analyzeSearchText(value) {
  const source = String(value ?? "");
  return {
    source,
    normalized: normalizeSearchText(source),
    tokens: tokenizeSearchText(source)
  };
}
