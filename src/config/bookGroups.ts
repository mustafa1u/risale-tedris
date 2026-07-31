import type { Locale } from "@/i18n";

export type BookGroup = {
  id: "kucuk-kitaplar" | "sozler";
  labels: Record<Locale, string>;
  slugs: readonly string[];
};

export const BOOK_GROUPS = [
  {
    id: "kucuk-kitaplar",
    labels: {
      tr: "Küçük Kitaplar",
      en: "Small Books"
    },
    slugs: [
      "ayetul-kubra",
      "kucuk-sozler",
      "meyve-risalesi",
      "tabiat-risalesi"
    ]
  },
  {
    id: "sozler",
    labels: {
      tr: "Sözler",
      en: "Words"
    },
    slugs: [
      "11-soz",
      "13-soz",
      "18-soz",
      "24-soz",
      "31-soz",
      "32-soz",
      "33-soz"
    ]
  }
] as const satisfies readonly BookGroup[];

export function groupBooksBySlug<T extends { slug: string }>(
  books: readonly T[],
  locale: Locale
) {
  const booksBySlug = new Map(books.map((book) => [book.slug, book]));

  return BOOK_GROUPS.map((group) => ({
    id: group.id,
    label: group.labels[locale],
    books: group.slugs
      .map((slug) => booksBySlug.get(slug))
      .filter((book): book is T => Boolean(book))
  })).filter((group) => group.books.length > 0);
}
