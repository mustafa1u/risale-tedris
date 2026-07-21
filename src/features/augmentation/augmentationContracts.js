export const AUGMENTATION_SCHEMA_VERSION = 1;
export const AUGMENTATION_CATALOG_VERSION = 1;
export const AUGMENTATION_DB_NAME = "rissor-ag-augmentation";
export const AUGMENTATION_DB_VERSION = 1;
export const AUGMENTATION_WORKSPACE_MEDIA_TYPE = "application/vnd.rissor.workspace+json";
export const AUGMENTATION_WORKSPACE_EXTENSION = ".rissor-workspace.json";

export function partKey(bookSlug, partNo) {
  return `${bookSlug}:${partNo}`;
}

export function gradeSourceKey(bookSlug, gradeSlug, partNo) {
  return `${bookSlug}:${gradeSlug}:${partNo}`;
}

export function augmentedProjectPath(bookSlug, projectId, locale = "tr") {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/books/${encodeURIComponent(bookSlug)}/my-augmentations/view/?id=${encodeURIComponent(projectId)}`;
}

