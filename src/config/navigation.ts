export const NAV_ITEMS = [
  { id: "books", path: "/kitaplar/" },
  { id: "howItWorks", path: "/nasil-oluyor/" },
  { id: "lessonFlow", path: "/ders-akisi/" }
] as const;

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];
