export const NAV_ITEMS = [
  { id: "books", path: "/books/" },
  { id: "lessonFlow", path: "/lesson-flow/" },
  { id: "themes", path: "/themes/" }
] as const;

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];
