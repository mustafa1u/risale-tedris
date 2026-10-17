import type { Locale } from "@/i18n";

export type BookGroup = {
  id: "kucuk-kitaplar" | "sozler" | "kucuk-kitaplar-en" | "sozler-en";
  language: "tr" | "en";
  labels: Record<Locale, string>;
  slugs: readonly string[];
};

export type BookLanguageSection = {
  id: "turkish" | "english";
  labels: Record<Locale, string>;
  language: BookGroup["language"];
};

export const BOOK_GROUPS = [
  {
    id: "kucuk-kitaplar",
    language: "tr",
    labels: {
      tr: "Küçük Boy Risaleler",
      en: "Small-Format Risales"
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
    language: "tr",
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
  },
  {
    id: "kucuk-kitaplar-en",
    language: "en",
    labels: {
      tr: "Küçük Boy Risaleler",
      en: "Small-Format Risales"
    },
    slugs: ["supreme-sign", "short-words"]
  },
  {
    id: "sozler-en",
    language: "en",
    labels: {
      tr: "Words",
      en: "Words"
    },
    slugs: ["11-soz-eng", "13-soz-eng", "18-soz-eng"]
  }
] as const satisfies readonly BookGroup[];

export const BOOK_LANGUAGE_SECTIONS = [
  {
    id: "turkish",
    language: "tr",
    labels: {
      tr: "Türkçe",
      en: "Turkish"
    }
  },
  {
    id: "english",
    language: "en",
    labels: {
      tr: "İngilizce",
      en: "English"
    }
  }
] as const satisfies readonly BookLanguageSection[];

export function groupBooksBySlug<T extends { slug: string }>(
  books: readonly T[],
  locale: Locale,
  language?: BookGroup["language"]
) {
  const booksBySlug = new Map(books.map((book) => [book.slug, book]));

  return BOOK_GROUPS.filter((group) => language === undefined || group.language === language).map((group) => ({
    id: group.id,
    label: group.labels[locale],
    books: group.slugs
      .map((slug) => booksBySlug.get(slug))
      .filter((book): book is T => Boolean(book))
  })).filter((group) => group.books.length > 0);
}

export function groupBooksByLanguage<T extends { slug: string }>(books: readonly T[], locale: Locale) {
  return BOOK_LANGUAGE_SECTIONS.map((section) => ({
    id: section.id,
    label: section.labels[locale],
    shelves: groupBooksBySlug(books, locale, section.language)
  })).filter((section) => section.shelves.length > 0);
}
