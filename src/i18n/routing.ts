import { DEFAULT_LOCALE, type Locale } from "@/i18n";

const EN_PREFIX = "/en";

type LocalizedRoute = {
  logical: string;
  tr: string;
  en: string;
};

// Logical paths keep links in feature components language-neutral. The visible
// path is selected here so Turkish and English can use their own vocabulary.
export const LOCALIZED_ROUTES: LocalizedRoute[] = [
  { logical: "/books/", tr: "/kitaplar/", en: "/books/" },
  { logical: "/nasil-oluyor/", tr: "/nasil-oluyor/", en: "/how-it-works/" },
  { logical: "/lesson-flow/", tr: "/ders-akisi/", en: "/lesson-flow/" },
  { logical: "/study/", tr: "/calisma/", en: "/study/" },
  { logical: "/themes/", tr: "/temalar/", en: "/themes/" },
  { logical: "/newsletter-confirmed/", tr: "/bulten-onayi/", en: "/newsletter-confirmed/" }
];

function withLeadingSlash(pathname: string): string {
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function splitPathSuffix(pathname: string): { path: string; suffix: string } {
  const match = pathname.match(/^([^?#]*)([?#].*)?$/u);
  return { path: match?.[1] || "/", suffix: match?.[2] || "" };
}

function stripEnglishPrefix(pathname: string): { locale: Locale; path: string } {
  if (pathname === EN_PREFIX) {
    return { locale: "en", path: "/" };
  }

  if (pathname.startsWith(`${EN_PREFIX}/`)) {
    return { locale: "en", path: pathname.slice(EN_PREFIX.length) || "/" };
  }

  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

function routePrefixMatch(pathname: string, prefix: string): string | null {
  const prefixWithoutTrailingSlash = prefix.slice(0, -1);
  if (pathname === prefixWithoutTrailingSlash) {
    return "/";
  }

  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) : null;
}

function logicalPath(pathname: string): string {
  const { path } = stripEnglishPrefix(pathname);

  for (const route of LOCALIZED_ROUTES) {
    for (const locale of [DEFAULT_LOCALE, "en"] as const) {
      const remainder = routePrefixMatch(path, route[locale]);
      if (remainder !== null) {
        return `${route.logical}${remainder === "/" ? "" : remainder}`;
      }
    }
  }

  return path;
}

function pathForLocale(locale: Locale, pathname: string): string {
  for (const route of LOCALIZED_ROUTES) {
    const remainder = routePrefixMatch(pathname, route.logical);
    if (remainder !== null) {
      return `${route[locale]}${remainder === "/" ? "" : remainder}`;
    }
  }

  return pathname;
}

export function pathWithoutLocale(pathname: string): string {
  const { path } = splitPathSuffix(withLeadingSlash(pathname));
  return logicalPath(path) || "/";
}

export function localizedPath(locale: Locale, pathname: string): string {
  const { path, suffix } = splitPathSuffix(withLeadingSlash(pathname));
  const localized = pathForLocale(locale, logicalPath(path));

  if (locale === DEFAULT_LOCALE) {
    return `${localized}${suffix}`;
  }

  return `${localized === "/" ? `${EN_PREFIX}/` : `${EN_PREFIX}${localized}`}${suffix}`;
}
