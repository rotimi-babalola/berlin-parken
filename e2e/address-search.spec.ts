import { expect, test } from "@playwright/test";

const suggestion = {
  id: "berlin-alexanderplatz-1",
  label: "Alexanderplatz 1",
  detail: "10178 · Mitte · Berlin",
  latitude: 52.521,
  longitude: 13.413,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/geocode?**", async (route) => {
    await route.fulfill({
      json: { suggestions: [suggestion] },
    });
  });
});

test("searches, selects an address, and shows nearby parking", async ({ page }) => {
  let requestedRadius: string | null = null;
  await page.route("**/api/parking?**", async (route) => {
    requestedRadius = new URL(route.request().url()).searchParams.get("radius");
    await route.fulfill({
      json: {
        status: "available",
        mappedSpaces: 42,
        usableSpaces: 30,
        conditionalSpaces: 8,
        restrictedSpaces: 4,
        unknownSpaces: 0,
        featureCount: 3,
        streets: [{ name: "Alexanderstraße", mappedSpaces: 42, features: 3 }],
      },
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Know the streets/ })).toBeVisible();

  const address = page.getByRole("combobox", { name: "Destination address" });
  await address.fill("Alexanderplatz");
  await page.getByRole("option", { name: /Alexanderplatz 1/ }).click();
  const radius = page.getByRole("slider");
  await radius.focus();
  await radius.press("End");
  await radius.press("ArrowLeft");
  await radius.press("ArrowLeft");
  await radius.press("ArrowLeft");
  await page.getByRole("button", { name: "Check nearby streets" }).click();

  const results = page.getByRole("region", { name: "Mapped street parking" });
  await expect(results).toContainText("Alexanderplatz 1");
  await expect(results).toContainText("42");
  await expect(results).toContainText("Alexanderstraße");
  await expect(results).toContainText("30");
  expect(requestedRadius).toBe("700");
});

test("requires selecting an address suggestion before searching", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Destination address" }).fill("Alexanderplatz");
  await page.getByRole("button", { name: "Check nearby streets" }).click();

  await expect(page.getByText("Select a Berlin address suggestion before continuing.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Destination address" })).toHaveAttribute("aria-invalid", "true");
});
