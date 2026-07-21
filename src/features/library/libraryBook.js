function hasVariant(variant) {
  return Boolean(variant?.docx || variant?.pdfNormal || variant?.pdfMobile);
}

function hasDocumentType(downloads, docType) {
  return Object.values(downloads ?? {}).some((gradeDownloads) => hasVariant(gradeDownloads?.[docType]));
}

export function getPartCapabilityItems(part) {
  const downloads = part?.downloads ?? {};
  const gradeLevelCount = Object.keys(downloads).length;
  const items = [];

  if (part?.textUrl || part?.textSourcePath) {
    items.push({ key: "text" });
  }

  if (gradeLevelCount > 0) {
    items.push({ key: "gradeLevels", count: gradeLevelCount });
  }

  if (hasDocumentType(downloads, "BK")) {
    items.push({ key: "flashcards" });
  }

  if (hasDocumentType(downloads, "SK")) {
    items.push({ key: "questionSheets" });
  }

  return items;
}
