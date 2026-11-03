import type { Locale } from "@/i18n";
import type { GradeSlug } from "@/types/library";

export type GradeRangeDisplay = {
  shortLabel: string;
  levelLabel: string;
  rangeLabel: string;
  explanatoryLabel: string;
};

const gradeRangeLabels: Record<Locale, Record<GradeSlug, GradeRangeDisplay>> = {
  tr: {
    "2-sinif": {
      shortLabel: "2-3. sınıflar",
      levelLabel: "2-3. sınıflar",
      rangeLabel: "2-3. sınıflar",
      explanatoryLabel: "2-3. sınıflar"
    },
    "5-sinif": {
      shortLabel: "4-6. sınıflar",
      levelLabel: "4-6. sınıflar",
      rangeLabel: "4-6. sınıflar",
      explanatoryLabel: "4-6. sınıflar"
    },
    "8-sinif": {
      shortLabel: "7-9. sınıflar",
      levelLabel: "7-9. sınıflar",
      rangeLabel: "7-9. sınıflar",
      explanatoryLabel: "7-9. sınıflar"
    },
    "11-sinif": {
      shortLabel: "10-12. sınıflar",
      levelLabel: "10-12. sınıflar",
      rangeLabel: "10-12. sınıflar",
      explanatoryLabel: "10-12. sınıflar"
    },
    "lisans": {
      shortLabel: "Lise sonrası",
      levelLabel: "Lise sonrası",
      rangeLabel: "lise mezunu ve üzeri",
      explanatoryLabel: "Lise sonrası"
    }
  },
  en: {
    "2-sinif": {
      shortLabel: "Grades 2-3",
      levelLabel: "Grades 2-3",
      rangeLabel: "Grades 2-3",
      explanatoryLabel: "Grades 2-3"
    },
    "5-sinif": {
      shortLabel: "Grades 4-6",
      levelLabel: "Grades 4-6",
      rangeLabel: "Grades 4-6",
      explanatoryLabel: "Grades 4-6"
    },
    "8-sinif": {
      shortLabel: "Grades 7-9",
      levelLabel: "Grades 7-9",
      rangeLabel: "Grades 7-9",
      explanatoryLabel: "Grades 7-9"
    },
    "11-sinif": {
      shortLabel: "Grades 10-12",
      levelLabel: "Grades 10-12",
      rangeLabel: "Grades 10-12",
      explanatoryLabel: "Grades 10-12"
    },
    "lisans": {
      shortLabel: "post-high-school",
      levelLabel: "Post-high-school",
      rangeLabel: "high-school graduates and above",
      explanatoryLabel: "Post-high-school"
    }
  }
};

export function getGradeRangeDisplay(locale: Locale, slug: GradeSlug, fallback?: string): GradeRangeDisplay {
  const display = gradeRangeLabels[locale][slug];
  if (display) {
    return display;
  }

  const fallbackLabel = fallback ?? slug;
  return {
    shortLabel: fallbackLabel,
    levelLabel: fallbackLabel,
    rangeLabel: fallbackLabel,
    explanatoryLabel: fallbackLabel
  };
}

export function getGradeLabel(locale: Locale, slug: GradeSlug, fallback?: string): string {
  return getGradeRangeDisplay(locale, slug, fallback).levelLabel;
}

export function getGradeShortLabel(locale: Locale, slug: GradeSlug, fallback?: string): string {
  return getGradeRangeDisplay(locale, slug, fallback).shortLabel;
}

export function getGradeRangeLabel(locale: Locale, slug: GradeSlug, fallback?: string): string {
  return getGradeRangeDisplay(locale, slug, fallback).rangeLabel;
}

export function getGradeExplanatoryLabel(locale: Locale, slug: GradeSlug, fallback?: string): string {
  return getGradeRangeDisplay(locale, slug, fallback).explanatoryLabel;
}
