import { expect, test } from "@playwright/test";

test("searches only the current book shard and combines worker results with grade filtering", async ({ page }) => {
  const searchAssetRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/assets/search/") && request.url().endsWith(".json")) {
      searchAssetRequests.push(request.url());
    }
  });

  await page.goto("/books/meyve-risalesi/");
  await expect(page.locator("[data-book-search-input]")).toHaveCount(0);
  expect(searchAssetRequests).toHaveLength(0);

  await page.locator("[data-book-search-trigger]").click();
  const input = page.locator("[data-book-search-input]");
  await expect(input).toBeFocused();
  await expect(page.locator(".search-book-filter")).toHaveCount(0);
  await expect(page.locator('[data-search-status="ready"]')).toBeVisible({ timeout: 20_000 });
  expect(new Set(searchAssetRequests).size).toBe(1);
  expect(searchAssetRequests.some((url) => url.includes("global."))).toBe(false);

  await input.fill("iman");
  await expect.poll(async () => page.locator("[data-part-row]:visible").count()).toBeLessThan(106);
  await expect.poll(async () => page.locator("[data-part-row]:visible").count()).toBeGreaterThan(0);

  await page.locator("[data-book-grade-filter]").selectOption("8-sinif");
  await expect.poll(async () => page.locator("[data-part-row]:visible").count()).toBeGreaterThan(0);
  for (const row of await page.locator("[data-part-row]:visible").all()) {
    await expect(row).toHaveAttribute("data-grades", /(?:^| )8-sinif(?: |$)/);
  }
});

test("falls back to metadata row filtering when the current shard cannot load", async ({ page }) => {
  await page.route("**/assets/search/*.json", (route) => route.abort());
  await page.goto("/books/meyve-risalesi/");
  await page.locator("[data-book-search-trigger]").click();

  await expect(page.getByRole("button", { name: "Yeniden dene" })).toBeVisible({ timeout: 20_000 });
  await page.locator("[data-book-search-input]").fill("P55");
  await expect(page.locator('[data-part-row][data-part-no="p55"]')).toBeVisible();
  await expect(page.locator("[data-part-row]:visible")).toHaveCount(1);
});
