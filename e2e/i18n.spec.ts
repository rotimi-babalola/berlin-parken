import { expect, test } from "@playwright/test";

test("switches the interface to German and remembers it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "DE", exact: true }).click();

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
    page.getByRole("button", { name: "DE", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Zieladresse" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  await page.goto("/parking/mitte");
  await expect(
    page.getByRole("heading", { level: 1, name: "Parken in Berlin-Mitte" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parken in Mitte prüfen" }),
  ).toBeVisible();
});
