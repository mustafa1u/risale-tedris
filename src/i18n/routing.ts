import { DEFAULT_LOCALE, type Locale } from "@/i18n";

const EN_PREFIX = "/en";

export function pathWithoutLocale(pathname: string): string {
  let path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (path === EN_PREFIX) {
    return "/";
  }

  if (path.startsWith(`${EN_PREFIX}/`)) {
    path = path.slice(EN_PREFIX.length);
  }

  return path || "/";
}

export function localizedPath(locale: Locale, pathname: string): string {
  const path = pathWithoutLocale(pathname);

  if (locale === DEFAULT_LOCALE) {
    return path;
  }

  return path === "/" ? `${EN_PREFIX}/` : `${EN_PREFIX}${path}`;
}
