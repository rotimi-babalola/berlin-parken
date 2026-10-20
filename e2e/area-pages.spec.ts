import { expect, test } from "@playwright/test";

test("homepage lists the Kreuzberg and Charlottenburg guides", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('a[href="/parking/mitte"]')).toBeVisible();
  await expect(page.locator('a[href="/parking/kreuzberg"]')).toBeVisible();
  await expect(page.locator('a[href="/parking/charlottenburg"]')).toBeVisible();

  await page.locator('a[href="/parking/kreuzberg"]').click();
  await expect(page).toHaveURL(/\/parking\/kreuzberg$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Parking in Berlin Kreuzberg",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check parking in Kreuzberg" }),
  ).toBeVisible();
});

test("homepage links to the Mitte guide and the guide starts a search", async ({
  page,
}) => {
  await page.route("**/api/parking?**", async (route) => {
    await route.fulfill({
      json: {
        status: "available",
        mappedSpaces: 0,
        usableSpaces: 0,
        conditionalSpaces: 0,
        restrictedSpaces: 0,
        unknownSpaces: 0,
        featureCount: 0,
        streets: [],
        candidates: [],
      },
    });
  });

  await page.goto("/");
  await page.locator('a[href="/parking/mitte"]').click();

  await expect(page).toHaveURL(/\/parking\/mitte$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Parking in Berlin Mitte" }),
  ).toBeVisible();
  await expect(
    page.getByText("Mapped supply is not live vacancy."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Parkraumbewirtschaftung (Parkzonen) – Berlin Open Data",
    }),
  ).toHaveAttribute("href", /daten\.berlin\.de/);

  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);

  await page.getByRole("button", { name: "Check parking in Mitte" }).click();
  await page.waitForURL(/\/results\?/);

  const url = new URL(page.url());
  expect(url.searchParams.get("label")).toBe("Mitte, Berlin");
  expect(url.searchParams.get("lat")).toBe("52.5219");
  expect(url.searchParams.get("radius")).toBe("500");
  expect(
    Number.isFinite(Date.parse(url.searchParams.get("arrival") ?? "")),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Mitte, Berlin" }),
  ).toBeVisible();
});
