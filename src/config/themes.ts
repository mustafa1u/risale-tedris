export const THEMES = {
  risaleTedris: {},
  slate: {},
  field: {},
  ink: {},
  school: {}
} as const;

export type ThemeName = keyof typeof THEMES;

export const ACTIVE_THEME: ThemeName = "risaleTedris";
