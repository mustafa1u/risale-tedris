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

test("restores global result state in fixed-book context and offers explicit broadening", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-global-search-trigger]").click();
  await page.getByText("Tam ifade", { exact: true }).click();
  await page.getByText("Parça numaraları", { exact: true }).click();
  await page.locator("[data-global-search-input]").fill("iman");
  await expect(page.locator("[data-search-within-book]").first()).toBeVisible({ timeout: 20_000 });

  const resultLink = page.locator("[data-search-within-book]").first();
  const resultHref = await resultLink.getAttribute("href");
  expect(resultHref).toMatch(/\?q=iman&context=[a-z0-9-]+&mode=exact&scope=text%2Ctitle&distance=5$/);
  await resultLink.click();

  await expect(page.locator("[data-book-search-input]")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-book-search-input]")).toHaveValue("iman");
  await expect(page.getByRole("radio", { name: "Tam ifade" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Parça numaraları" })).not.toBeChecked();
  await expect(page.locator(".search-book-filter")).toHaveCount(0);

  const globalAction = page.locator("[data-global-search-action]");
  await expect(globalAction).toHaveText("Tüm kitaplarda ara");
  await expect(globalAction).toHaveAttribute(
    "href",
    /^\/?\?q=iman&context=global&books=ayetul-kubra%2Ckucuk-sozler%2Cmeyve-risalesi%2Ctabiat-risalesi&mode=exact&scope=text%2Ctitle&distance=5$/
  );
});
