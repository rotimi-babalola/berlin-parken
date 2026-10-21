import { expect, test } from "@playwright/test";

test("German URLs ship German HTML without client JavaScript", async ({
  request,
}) => {
  const response = await request.get("/de");
  expect(response.ok()).toBe(true);
  const html = await response.text();

  expect(html).toContain('<html lang="de"');
  expect(html).toContain("Parken in Berlin: Zonen");
  expect(html).toContain(
    "Prüfe erfasste Straßenparkplätze in der Nähe einer Berliner Adresse",
  );
  expect(html).toContain('href="/de/parking/mitte"');
});

test("redirects stored German visitors to the German URL without a loop", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "DE", exact: true }).click();
  await expect(page).toHaveURL(/\/de$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  // English-only routes must not be rewritten into a /de 404.
  await page.goto("/design");
  await expect(page).toHaveURL(/\/design$/);

  await page.goto("/de");
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
});

test("serves German content at stable URLs and links equivalents", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: "DE", exact: true }),
  ).toHaveAttribute("href", "/de");

  await page.getByRole("link", { name: "DE", exact: true }).click();
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Parken in Berlin",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "besser planen",
  );
  await expect(
    page.getByRole("combobox", { name: "Zieladresse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "DE", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveTitle(/Parken in Berlin: Zonen/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/de$/,
  );
  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveAttribute("href", /^https?:\/\/[^/]+$/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("combobox", { name: "Zieladresse" }),
  ).toBeVisible();

  await page.locator('a[href="/de/parking/mitte"]').click();
  await expect(page).toHaveURL(/\/de\/parking\/mitte$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Parken in Berlin-Mitte" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parken in Mitte prüfen" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Parken in Berlin-Mitte/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/de\/parking\/mitte$/,
  );
  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveAttribute("href", /\/parking\/mitte$/);
  await expect(
    page.locator('link[rel="alternate"][hreflang="de"]'),
  ).toHaveAttribute("href", /\/de\/parking\/mitte$/);

  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/parking\/mitte$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Parking in Berlin Mitte",
    }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/parking\/mitte$/,
  );
  await expect(
    page.locator('link[rel="alternate"][hreflang="de"]'),
  ).toHaveAttribute("href", /\/de\/parking\/mitte$/);
});
