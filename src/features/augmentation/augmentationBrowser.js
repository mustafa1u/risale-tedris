import {
  AUGMENTATION_WORKSPACE_EXTENSION,
  AUGMENTATION_WORKSPACE_MEDIA_TYPE,
  augmentedProjectPath
} from "./augmentationContracts.js";

export const AUGMENTATION_GRADE_SLUGS = [
  "2-sinif",
  "5-sinif",
  "8-sinif",
  "11-sinif",
  "lisans"
];

export function orderAugmentationGradeSlugs(gradeSlugs = []) {
  const uniqueSlugs = [...new Set(gradeSlugs ?? [])];
  const available = new Set(uniqueSlugs);
  const known = new Set(AUGMENTATION_GRADE_SLUGS);
  return [
    ...AUGMENTATION_GRADE_SLUGS.filter((slug) => available.has(slug)),
    ...uniqueSlugs.filter((slug) => !known.has(slug))
  ];
}

export function downloadWorkspaceText(text, fileName = `rissor-workspace${AUGMENTATION_WORKSPACE_EXTENSION}`) {
  const blob = new Blob([text], { type: AUGMENTATION_WORKSPACE_MEDIA_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function projectDetailPath(project, locale) {
  return augmentedProjectPath(project.homeBookSlug, project.id, locale);
}

export function localStudyPath(projectId, gradeSlug, locale = "tr") {
  const prefix = locale === "en" ? "/en" : "";
  const params = new URLSearchParams({ augmentation: projectId, grade: gradeSlug });
  return `${prefix}/study/?${params.toString()}`;
}
