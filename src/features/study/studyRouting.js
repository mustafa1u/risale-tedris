export const STUDY_ROUTE_PATH = "/study/";

export function studyDeckPath({ bookSlug, gradeSlug, partNo }) {
  const params = new URLSearchParams({
    book: bookSlug,
    grade: gradeSlug,
    part: partNo
  });

  return `${STUDY_ROUTE_PATH}?${params.toString()}`;
}

export function legacyStudyDeckPath({ bookSlug, gradeSlug, partNo }) {
  return `/books/${bookSlug}/study/${gradeSlug}/${partNo}/`;
}

export function parseStudyDeckParams(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams ?? "");
  const bookSlug = params.get("book");
  const gradeSlug = params.get("grade");
  const partNo = params.get("part");

  if (!bookSlug || !gradeSlug || !partNo) {
    return null;
  }

  return { bookSlug, gradeSlug, partNo };
}

export function findStudyDeckRoute(libraryIndex, { bookSlug, gradeSlug, partNo }) {
  const book = libraryIndex?.books?.find((item) => item.slug === bookSlug);
  if (!book) {
    return null;
  }

  const deck = book.studyDeckRoutes?.find((item) => item.gradeSlug === gradeSlug && item.partNo === partNo);

  return deck ? { book, deck } : null;
}

export function findStudyDeck(book, gradeSlug, partNo) {
  return book.studyDecks.find(
    (deck) => deck.gradeSlug === gradeSlug && deck.partNo === partNo
  ) ?? null;
}
