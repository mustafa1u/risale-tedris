const OUTPUT_FORMATS = [
  { key: "word", countKey: "docxCount" },
  { key: "pdf", countKey: "pdfNormalCount" },
  { key: "mobilePdf", countKey: "pdfMobileCount" }
];

export function getHomepageStats(library) {
  const gradeSlugs = new Set();

  for (const book of library?.books ?? []) {
    for (const grade of book.grades ?? []) {
      if (grade?.slug) {
        gradeSlugs.add(grade.slug);
      }
    }
  }

  const formats = OUTPUT_FORMATS.filter(({ countKey }) => (library?.stats?.[countKey] ?? 0) > 0).map(
    ({ key }) => key
  );

  return [
    { key: "books", value: library?.stats?.bookCount ?? 0 },
    { key: "parts", value: library?.stats?.partCount ?? 0 },
    { key: "gradeLevels", value: gradeSlugs.size },
    { key: "formats", formats }
  ];
}

export function getHomepageCtas() {
  return {
    booksHref: "/books/",
    lessonFlowHref: "/lesson-flow/"
  };
}

export function getHomepageGradeRanges(library) {
  const seen = new Set();
  const ranges = [];

  for (const book of library?.books ?? []) {
    for (const grade of book.grades ?? []) {
      if (!grade?.slug || seen.has(grade.slug)) {
        continue;
      }

      seen.add(grade.slug);
      ranges.push(grade.label ? { slug: grade.slug, label: grade.label } : { slug: grade.slug });
    }
  }

  return ranges;
}
