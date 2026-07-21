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
      shortLabel: "2-3. okul sınıfları",
      levelLabel: "2. sınıf seviyesi",
      rangeLabel: "2-3. sınıflar",
      explanatoryLabel: "2. sınıf seviyesi - 2-3. okul sınıfları için"
    },
    "5-sinif": {
      shortLabel: "4-6. okul sınıfları",
      levelLabel: "5. sınıf seviyesi",
      rangeLabel: "4-6. sınıflar",
      explanatoryLabel: "5. sınıf seviyesi - 4-6. okul sınıfları için"
    },
    "8-sinif": {
      shortLabel: "7-9. okul sınıfları",
      levelLabel: "8. sınıf seviyesi",
      rangeLabel: "7-9. sınıflar",
      explanatoryLabel: "8. sınıf seviyesi - 7-9. okul sınıfları için"
    },
    "11-sinif": {
      shortLabel: "10-12. okul sınıfları",
      levelLabel: "11. sınıf seviyesi",
      rangeLabel: "10-12. sınıflar",
      explanatoryLabel: "11. sınıf seviyesi - 10-12. okul sınıfları için"
    },
    "lisans": {
      shortLabel: "Lise sonrası",
      levelLabel: "Lise sonrası seviye",
      rangeLabel: "lise mezunu ve üzeri",
      explanatoryLabel: "Lise sonrası seviye - lise mezunu ve üzeri için"
    }
  },
  en: {
    "2-sinif": {
      shortLabel: "grades 2-3",
      levelLabel: "2nd-grade level",
      rangeLabel: "school grades 2-3",
      explanatoryLabel: "2nd-grade level - for school grades 2-3"
    },
    "5-sinif": {
      shortLabel: "grades 4-6",
      levelLabel: "5th-grade level",
      rangeLabel: "school grades 4-6",
      explanatoryLabel: "5th-grade level - for school grades 4-6"
    },
    "8-sinif": {
      shortLabel: "grades 7-9",
      levelLabel: "8th-grade level",
      rangeLabel: "school grades 7-9",
      explanatoryLabel: "8th-grade level - for school grades 7-9"
    },
    "11-sinif": {
      shortLabel: "grades 10-12",
      levelLabel: "11th-grade level",
      rangeLabel: "school grades 10-12",
      explanatoryLabel: "11th-grade level - for school grades 10-12"
    },
    "lisans": {
      shortLabel: "post-high-school",
      levelLabel: "Post-high-school level",
      rangeLabel: "high-school graduates and above",
      explanatoryLabel: "Post-high-school level - for high-school graduates and above"
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
