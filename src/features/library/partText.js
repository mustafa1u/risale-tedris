const arabicScriptPattern = /\p{Script=Arabic}/u;
const latinScriptPattern = /\p{Script=Latin}/u;
const arabicTextPattern =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u0640\u060C\u061B\u061F.:!?'"\u201C\u201D\u2018\u2019()\-\u2013\u2014]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/gu;

/**
 * @typedef {"latin" | "arabic"} PartTextScript
 * @typedef {{ script: PartTextScript, value: string }} PartTextSegment
 * @typedef {{ alignment: "start" | "center", segments: PartTextSegment[] }} PartTextParagraph
 */

/**
 * @param {string} value
 * @returns {PartTextSegment[]}
 */
export function segmentPartText(value) {
  const segments = [];
  let cursor = 0;

  for (const match of value.matchAll(arabicTextPattern)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ script: "latin", value: value.slice(cursor, index) });
    }

    segments.push({ script: "arabic", value: match[0] });
    cursor = index + match[0].length;
  }

  if (cursor < value.length) {
    segments.push({ script: "latin", value: value.slice(cursor) });
  }

  return segments;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isArabicOnlyParagraph(value) {
  return arabicScriptPattern.test(value) && !latinScriptPattern.test(value);
}

/**
 * @param {string} value
 * @returns {PartTextParagraph[]}
 */
export function splitPartText(value) {
  return value
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n?/gu, "\n")
    .trimEnd()
    .split(/\n[ \t\f\v]*\n/u)
    .map((paragraph) => ({
      alignment: isArabicOnlyParagraph(paragraph) ? "center" : "start",
      segments: segmentPartText(paragraph)
    }));
}

export function partTextParagraphValue(paragraph) {
  return (paragraph?.segments ?? []).map((segment) => segment.value).join("").trim();
}

export function isPartTextSectionSeparator(paragraph) {
  return partTextParagraphValue(paragraph) === "---";
}

export function hasPartTextSectionSeparators(paragraphs) {
  return (paragraphs ?? []).some(isPartTextSectionSeparator);
}

export function isSectionedPartTextHeading(paragraphs, index, hasSectionSeparators = hasPartTextSectionSeparators(paragraphs)) {
  if (!hasSectionSeparators || isPartTextSectionSeparator(paragraphs?.[index])) {
    return false;
  }
  return index === 0 || isPartTextSectionSeparator(paragraphs[index - 1]);
}
