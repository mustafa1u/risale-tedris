import { findStudyDeck, studyDeckPath } from "../study/studyRouting.js";

const DOC_TYPES = ["BK", "SK"];

function downloadAction(asset) {
  return asset?.url ? { available: true, href: asset.url, download: true } : { available: false };
}

function studyAction({ book, gradeSlug, partNo, docType }) {
  if (docType !== "BK" || !findStudyDeck(book, gradeSlug, partNo)) {
    return { available: false };
  }

  return {
    available: true,
    href: studyDeckPath({
      bookSlug: book.slug,
      gradeSlug,
      partNo
    })
  };
}

export function getPartDownloadGroups({ book, part }) {
  return (book?.grades ?? []).map((grade) => {
    const gradeSlug = grade.slug;
    const gradeDownloads = part?.downloads?.[gradeSlug] ?? {};

    return {
      gradeSlug,
      materials: DOC_TYPES.map((docType) => {
        const variant = gradeDownloads[docType];

        return {
          docType,
          actions: {
            study: studyAction({ book, gradeSlug, partNo: part.partNo, docType }),
            docx: downloadAction(variant?.docx),
            pdfNormal: downloadAction(variant?.pdfNormal),
            pdfMobile: downloadAction(variant?.pdfMobile)
          }
        };
      })
    };
  });
}
