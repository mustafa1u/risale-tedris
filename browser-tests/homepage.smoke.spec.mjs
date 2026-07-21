import { expect, test } from "@playwright/test";

test("opens the homepage and focuses the grid-menu trigger", async ({ page }) => {
  await page.goto("/");

  const menuTrigger = page.locator("[data-site-menu-trigger]");
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.focus();
  await expect(menuTrigger).toBeFocused();
  await expect(menuTrigger).toContainText("Menü");
});

test("opens homepage search by pointer and keyboard with input focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-global-search-trigger]");
  const input = page.locator("[data-global-search-input]");

  await trigger.click();
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Aramayı kapat" }).click();

  await trigger.focus();
  await trigger.press("Enter");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Aramayı kapat" }).click();

  await trigger.focus();
  await trigger.press("Space");
  await expect(input).toBeFocused();
});

test("keeps search state while coordinating mutual exclusion with the grid menu", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-global-search-trigger]");
  const input = page.locator("[data-global-search-input]");
  const menu = page.locator("[data-site-menu]");
  const menuTrigger = page.locator("[data-site-menu-trigger]");

  await menuTrigger.click();
  await expect(menu).toHaveAttribute("open", "");
  await trigger.click();
  await expect(menu).not.toHaveAttribute("open", "");
  await input.fill("iman");

  await menuTrigger.click();
  await expect(input).toBeHidden();
  await trigger.click();
  await expect(input).toHaveValue("iman");
  await expect(menu).not.toHaveAttribute("open", "");
});

test("shows global defaults and renders canonical cross-book worker results", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();

  const modeGroup = page.getByRole("group", { name: "Arama biçimi" });
  const scopeGroup = page.getByRole("group", { name: "Şurada ara" });
  const bookFilter = page.locator(".search-book-filter");

  await expect(modeGroup.getByRole("radio", { name: "Tüm kelimeler" })).toBeChecked();
  await expect(scopeGroup.getByRole("checkbox")).toHaveCount(3);
  for (const scope of await scopeGroup.getByRole("checkbox").all()) {
    await expect(scope).toBeChecked();
  }

  await bookFilter.locator("summary").click();
  await expect(bookFilter.getByRole("checkbox")).toHaveCount(4);
  for (const book of await bookFilter.getByRole("checkbox").all()) {
    await expect(book).toBeChecked();
  }

  await modeGroup.getByText("Yakınlık", { exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Kelime yakınlığı" })).toHaveValue("5");
  await modeGroup.getByText("Tüm kelimeler", { exact: true }).click();

  await page.locator("[data-global-search-input]").fill("iman");
  await expect(page.locator("[data-search-result-count]")).toContainText("sonuç bulundu", { timeout: 20_000 });

  const results = page.locator(".search-result-list");
  await expect(results).toHaveCount(1);
  const firstResult = results.getByRole("listitem").first();
  await expect(firstResult.locator(".search-result__book")).not.toBeEmpty();
  await expect(firstResult.locator(".search-result__part")).toContainText(/^P\d+$/);
  await expect(firstResult.locator("strong")).not.toBeEmpty();
  await expect(firstResult.locator("[data-search-result-link]")).toHaveAttribute("href", /^\/books\/[a-z0-9-]+\/parts\/p\d+\/$/);
  await expect(firstResult.locator("[data-search-within-book]")).toHaveAttribute(
    "href",
    /^\/books\/[a-z0-9-]+\/\?q=iman&context=[a-z0-9-]+&mode=all&scope=text%2Ctitle%2CpartNo&distance=5$/
  );
});

test("close preserves search state and clear preserves selected options", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-global-search-trigger]");
  const input = page.locator("[data-global-search-input]");

  await trigger.click();
  await page.getByText("Tam ifade", { exact: true }).click();
  await page.getByText("Parça numaraları", { exact: true }).click();
  const bookFilter = page.locator(".search-book-filter");
  await bookFilter.locator("summary").click();
  const firstBook = bookFilter.getByRole("checkbox").first();
  await bookFilter.locator("label").first().click();
  await input.fill("iman");

  await page.getByRole("button", { name: "Aramayı kapat" }).click();
  await trigger.click();
  await expect(input).toHaveValue("iman");
  await expect(page.getByRole("radio", { name: "Tam ifade" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Parça numaraları" })).not.toBeChecked();
  await bookFilter.locator("summary").click();
  await expect(firstBook).not.toBeChecked();

  await page.getByRole("button", { name: "Aramayı temizle" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("radio", { name: "Tam ifade" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Parça numaraları" })).not.toBeChecked();
  await expect(firstBook).not.toBeChecked();
});

test("selects all books and clears to one generated-order book without a wide chip row", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();
  const bookFilter = page.locator(".search-book-filter");
  await bookFilter.locator("summary").click();
  const checkboxes = bookFilter.getByRole("checkbox");

  await expect(checkboxes).toHaveCount(4);
  await bookFilter.getByRole("button", { name: "Seçimi temizle" }).click();
  await expect(checkboxes.nth(0)).toBeChecked();
  for (const checkbox of await checkboxes.all().then((items) => items.slice(1))) {
    await expect(checkbox).not.toBeChecked();
  }
  await expect(bookFilter.locator("summary strong")).toHaveText("1 kitap seçili");
  await expect(checkboxes.nth(0)).toBeDisabled();

  await bookFilter.getByRole("button", { name: "Tümünü seç" }).click();
  for (const checkbox of await checkboxes.all()) {
    await expect(checkbox).toBeChecked();
  }
  await expect(bookFilter.locator("summary strong")).toHaveText("4 kitap seçili");
});

test("loads a newly selected book provisionally and reuses its cached shard", async ({ page }) => {
  let releaseSecondShard;
  const secondShardGate = new Promise((resolve) => {
    releaseSecondShard = resolve;
  });
  let secondShardRequests = 0;
  await page.route(/\/assets\/search\/kucuk-sozler\..+\.v1\.json$/, async (route) => {
    secondShardRequests += 1;
    await secondShardGate;
    await route.continue();
  });

  await page.goto("/?q=iman&context=global&books=ayetul-kubra&mode=all&scope=text%2Ctitle%2CpartNo&distance=5");
  await expect(page.locator('[data-search-status="ready"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-search-result-count]")).toBeVisible();

  const bookFilter = page.locator(".search-book-filter");
  await bookFilter.locator("summary").click();
  const secondBook = bookFilter.getByRole("checkbox").nth(1);
  await secondBook.check();

  await expect(page.locator('[data-search-status="provisional"]')).toContainText("Sonuçlar geçici");
  await expect(page.locator("[data-search-result-count]")).toBeVisible();
  releaseSecondShard();
  await expect(page.locator('[data-search-status="ready"]')).toBeVisible({ timeout: 20_000 });

  await secondBook.uncheck();
  await secondBook.check();
  await expect(page.locator('[data-search-status="ready"]')).toBeVisible();
  expect(secondShardRequests).toBe(1);
});

test.describe("without search JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("preserves the homepage identity, primary actions, and native menu navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".brand img")).toBeVisible();
    await expect(page.locator(".home-hero h1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kitaplar", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ders Akışı", exact: true })).toBeVisible();

    const menu = page.locator("[data-site-menu]");
    await page.locator("[data-site-menu-trigger]").click();
    await expect(menu).toHaveAttribute("open", "");
    await expect(menu.locator("nav a")).toHaveCount(3);
  });
});
