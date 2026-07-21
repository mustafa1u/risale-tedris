export function isAugmentationEnabled({ development = false, publicFlag } = {}) {
  return development || publicFlag === "true";
}

export function isSearchEnabled({ development = false, publicFlag } = {}) {
  return development || publicFlag === "true";
}

export const AUGMENTATION_ENABLED = isAugmentationEnabled({
  development: import.meta.env?.DEV,
  publicFlag: import.meta.env?.PUBLIC_AUGMENTATION_ENABLED
});

export const SEARCH_ENABLED = isSearchEnabled({
  development: import.meta.env?.DEV,
  publicFlag: import.meta.env?.PUBLIC_SEARCH_ENABLED
});
