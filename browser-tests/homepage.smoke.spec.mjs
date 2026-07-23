import { expect, test } from "@playwright/test";

test("switches primary navigation at the exact desktop boundary", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto("/");

  const desktopNavigation = page.locator("[data-desktop-navigation]");
  const compactMenu = page.locator("[data-site-menu]");
  const menuTrigger = page.locator("[data-site-menu-trigger]");

  await expect(desktopNavigation).toBeVisible();
  await expect(desktopNavigation.locator("a")).toHaveCount(3);
  await expect(compactMenu).toBeHidden();
  await desktopNavigation.locator("a").first().focus();
  await expect(desktopNavigation.locator("a").first()).toBeFocused();
  await expect
    .poll(() => desktopNavigation.locator("a").first().evaluate((link) => getComputedStyle(link).outlineStyle))
    .toBe("solid");

  await page.setViewportSize({ width: 959, height: 900 });
  await expect(desktopNavigation).toBeHidden();
  await expect(compactMenu).toBeVisible();
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.focus();
  await expect(menuTrigger).toBeFocused();
  await expect(menuTrigger).toContainText("Menü");
});

test("marks the current primary section in both navigation presentations", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto("/books/ayetul-kubra/");

  await expect(page.locator('[data-desktop-navigation] a[aria-current="page"]')).toHaveAttribute("href", "/books/");

  await page.setViewportSize({ width: 959, height: 900 });
  await page.locator("[data-site-menu-trigger]").click();
  await expect(page.locator('[data-site-menu] a[aria-current="page"]')).toHaveAttribute("href", "/books/");
});

test("keeps the collection image close to the mobile hero actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 900 });

    const measurements = await page.evaluate(() => {
      const actions = document.querySelector(".home-actions")?.getBoundingClientRect();
      const image = document.querySelector(".home-hero__books img")?.getBoundingClientRect();

      if (!actions || !image) {
        throw new Error("Homepage hero actions or collection image are missing");
      }

      return {
        gap: Math.round(image.top - actions.bottom),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(measurements.scrollWidth).toBe(measurements.clientWidth);
    if (width === 390) {
      expect(measurements.gap).toBeGreaterThanOrEqual(0);
      expect(measurements.gap).toBeLessThanOrEqual(96);
    }
  }

  await page.setViewportSize({ width: 641, height: 900 });
  const desktopColumns = await page
    .locator(".home-hero__inner")
    .evaluate((hero) => getComputedStyle(hero).gridTemplateColumns.trim().split(/\s+/));
  expect(desktopColumns).toHaveLength(2);
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
  await page.setViewportSize({ width: 959, height: 900 });
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

test("keeps live search state in one replaceable URL and restores it on refresh", async ({ page }) => {
  await page.goto("/");
  const initialHistoryLength = await page.evaluate(() => history.length);
  await page.locator("[data-global-search-trigger]").click();
  await page.getByText("Tam ifade", { exact: true }).click();
  await page.getByText("Parça numaraları", { exact: true }).click();
  await page.locator("[data-global-search-input]").fill("iman nur");

  await expect(page).toHaveURL(
    /\?q=iman\+nur&context=global&books=ayetul-kubra%2Ckucuk-sozler%2Cmeyve-risalesi%2Ctabiat-risalesi&mode=exact&scope=text%2Ctitle&distance=5$/
  );
  expect(await page.evaluate(() => history.length)).toBe(initialHistoryLength);
  await expect(page.locator("[data-search-result-count]")).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(page.locator("[data-global-search-input]")).toHaveValue("iman nur");
  await expect(page.getByRole("radio", { name: "Tam ifade" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Parça numaraları" })).not.toBeChecked();
  await expect(page.locator('[data-search-status="restored"]')).toBeVisible({ timeout: 20_000 });
});

test("restores homepage search through result navigation Back and Forward", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();
  await page.locator("[data-global-search-input]").fill("iman");
  const resultLink = page.locator("[data-search-result-link]").first();
  await expect(resultLink).toBeVisible({ timeout: 20_000 });
  const searchUrl = page.url();

  await resultLink.click();
  await expect(page).toHaveURL(/\/books\/[a-z0-9-]+\/parts\/p\d+\/$/);
  await page.goBack();
  await expect(page).toHaveURL(searchUrl);
  await expect(page.locator("[data-global-search-input]")).toHaveValue("iman");
  await expect(page.locator("[data-search-result-link]").first()).toBeVisible({ timeout: 20_000 });

  await page.goForward();
  await expect(page).toHaveURL(/\/books\/[a-z0-9-]+\/parts\/p\d+\/$/);
  await page.goBack();
  await expect(page.locator("[data-global-search-input]")).toHaveValue("iman");
});

test("keeps live result and scroll state on Back without a second worker", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class SearchCountingWorker extends NativeWorker {
      constructor(...args) {
        super(...args);
        const count = Number(sessionStorage.getItem("__searchWorkerCount") ?? "0") + 1;
        sessionStorage.setItem("__searchWorkerCount", String(count));
      }
    };
  });
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();
  await page.locator("[data-global-search-input]").fill("iman");
  const resultLink = page.locator("[data-search-result-link]").first();
  await expect(resultLink).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => {
    window.scrollTo(0, 420);
  });
  const expectedScroll = await page.evaluate(() => window.scrollY);
  expect(expectedScroll).toBeGreaterThan(0);

  await resultLink.click();
  await page.goBack();
  await expect(page.locator("[data-search-result-link]").first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(expectedScroll);
  expect(await page.evaluate(() => sessionStorage.getItem("__searchWorkerCount"))).toBe("1");
  expect(await page.evaluate(() => Boolean(history.state?.rissorSearchSnapshotV1))).toBe(true);
});

test("stores only panel expansion in session storage", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();
  await page.reload();
  await expect(page.locator("[data-global-search-input]")).toBeVisible();

  await page.getByRole("button", { name: "Aramayı kapat" }).click();
  await page.reload();
  await expect(page.locator("[data-global-search-input]")).toHaveCount(0);

  const stored = await page.evaluate(() => ({
    session: Object.fromEntries(Object.entries(sessionStorage)),
    local: Object.fromEntries(Object.entries(localStorage))
  }));
  expect(stored.session["rissor:search:expanded:global"]).toBe("0");
  expect(JSON.stringify(stored.session)).not.toContain("query");
  expect(JSON.stringify(stored.local)).not.toContain("search");
});

test.describe("without search JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("preserves the homepage identity, primary actions, and native menu navigation", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto("/");

    await expect(page.locator(".brand img")).toBeVisible();
    await expect(page.locator(".home-hero h1")).toBeVisible();
    await expect(page.locator(".home-actions").getByRole("link", { name: "Kitaplar", exact: true })).toBeVisible();
    await expect(page.locator(".home-actions").getByRole("link", { name: "Ders Akışı", exact: true })).toBeVisible();
    await expect(page.locator("[data-desktop-navigation]")).toBeVisible();
    await expect(page.locator("[data-desktop-navigation] a")).toHaveCount(3);

    await page.setViewportSize({ width: 959, height: 900 });
    const menu = page.locator("[data-site-menu]");
    await page.locator("[data-site-menu-trigger]").click();
    await expect(menu).toHaveAttribute("open", "");
    await expect(menu.locator("nav a")).toHaveCount(3);
  });
});
