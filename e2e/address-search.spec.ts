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

test("searches, selects an address, and shows nearby parking", async ({
  page,
}) => {
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
  await expect(
    page.getByRole("heading", { name: /Know the streets/ }),
  ).toBeVisible();

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

test("shows the Bescheid report, side rail, and event carousel", async ({
  page,
}) => {
  const events = Array.from({ length: 7 }, (_, index) => ({
    id: `event-${index + 1}`,
    type: `Event ${index + 1}`,
    street: "Torstraße",
    borough: "Mitte",
    distanceMeters: 50 + index * 10,
  }));
  await page.route("**/api/parking?**", async (route) => {
    await route.fulfill({
      json: {
        status: "available",
        mappedSpaces: 850,
        usableSpaces: 600,
        conditionalSpaces: 150,
        restrictedSpaces: 80,
        unknownSpaces: 20,
        featureCount: 12,
        streets: [
          { name: "Torstraße", mappedSpaces: 420, features: 5 },
          { name: "Linienstraße", mappedSpaces: 310, features: 4 },
          { name: "Gormannstraße", mappedSpaces: 190, features: 3 },
        ],
        zones: {
          source: { status: "available", fetchedAt: new Date().toISOString() },
          items: [
            {
              id: "zone-12",
              zone: "12",
              borough: "Mitte",
              hours: "Mo–Sa 9–20 Uhr",
              fee: "2 € / 30 Min",
              distanceMeters: 120,
            },
          ],
        },
        events: {
          source: { status: "available", fetchedAt: new Date().toISOString() },
          items: events,
        },
      },
    });
  });

  await page.goto("/");
  const address = page.getByRole("combobox", { name: "Destination address" });
  await address.fill("Alexanderplatz");
  await page.getByRole("option", { name: /Alexanderplatz 1/ }).click();
  await page.getByRole("button", { name: "Check nearby streets" }).click();

  const results = page.getByRole("region", { name: "Mapped street parking" });
  await expect(results).toContainText("850");
  await expect(results.getByText("Moderate", { exact: true })).toBeVisible();
  await expect(
    results.getByRole("img", {
      name: "Supply estimate Moderate, level 2 of 3",
    }),
  ).toBeVisible();
  for (const numeral of ["I.", "II.", "III."]) {
    await expect(
      results.getByText(numeral, { exact: true }).first(),
    ).toBeVisible();
  }
  await expect(results).toContainText("Torstraße");

  const rail = page.getByRole("complementary", { name: "Nearby context" });
  await expect(
    rail.getByRole("region", { name: "Parking management zones" }),
  ).toContainText("Zone 12");

  const eventsRegion = rail.getByRole("region", {
    name: "Planned street events",
  });
  await expect(eventsRegion).toContainText("1–5 of 7");
  await expect(eventsRegion.getByText("Event 6", { exact: true })).toHaveCount(
    0,
  );
  await eventsRegion.getByRole("button", { name: "Show next events" }).click();
  await expect(eventsRegion).toContainText("6–7 of 7");
  await expect(
    eventsRegion.getByText("Event 6", { exact: true }),
  ).toBeVisible();
  await expect(
    eventsRegion.getByRole("button", { name: "Show next events" }),
  ).toBeDisabled();
  await eventsRegion
    .getByRole("button", { name: "Show previous events" })
    .click();
  await expect(eventsRegion).toContainText("1–5 of 7");
});

test("requires selecting an address suggestion before searching", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Destination address" })
    .fill("Alexanderplatz");
  await page.getByRole("button", { name: "Check nearby streets" }).click();

  await expect(
    page.getByText("Select a Berlin address suggestion before continuing."),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Destination address" }),
  ).toHaveAttribute("aria-invalid", "true");
});

test("recovers from a failed parking request with keyboard use on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  let requests = 0;
  await page.route("**/api/parking?**", async (route) => {
    requests += 1;
    await route.fulfill(
      requests === 1
        ? { status: 503, json: { error: "Provider busy" } }
        : {
            json: {
              status: "empty",
              mappedSpaces: 0,
              usableSpaces: 0,
              conditionalSpaces: 0,
              restrictedSpaces: 0,
              unknownSpaces: 0,
              featureCount: 0,
              streets: [],
            },
          },
    );
  });

  await page.goto("/");
  const address = page.getByRole("combobox", { name: "Destination address" });
  await address.fill("Alexanderplatz");
  await expect(
    page.getByRole("option", { name: /Alexanderplatz 1/ }),
  ).toBeVisible();
  await address.press("ArrowDown");
  await address.press("Enter");
  await page.getByRole("button", { name: "Check nearby streets" }).click();
  const retry = page.getByRole("button", { name: "Retry parking search" });
  await expect(retry).toBeVisible();
  await retry.focus();
  await retry.press("Enter");
  await expect(
    page.getByText("No mapped parking areas were returned for this radius."),
  ).toBeVisible();
  expect(requests).toBe(2);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (process.env.CAPTURE_VISUALS)
      await page.screenshot({
        path: `test-results/parking-${width}.png`,
        fullPage: true,
      });
  }
});
