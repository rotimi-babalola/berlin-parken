import { expect, test } from "@playwright/test";

test("each proposal searches and shows mock results on the same page", async ({
  page,
}) => {
  await page.goto("/design/proposals");
  await expect(page.getByLabel("Items per card")).toHaveValue("2");
  for (const name of ["City Signal", "Street Atlas", "Night Route"]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page
      .getByLabel("Berlin destination")
      .fill("Kantstraße 72, Berlin-Charlottenburg");
    await page.getByRole("button", { name: "Check nearby" }).click();
    await expect(page.getByText("320", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/design\/proposals$/);
    const details = page.getByRole("region", {
      name: "Explore nearby details",
    });
    await details.getByText("Nearby streets", { exact: true }).click();
    await expect(details).toContainText("160 mapped spaces");
    await expect(details).toContainText("145 conditional · 15 restricted");
    const cards = details.locator("details");
    const collapsedHeights = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
    expect(collapsedHeights[0] - collapsedHeights[1]).toBeGreaterThan(200);
    expect(collapsedHeights[0] - collapsedHeights[2]).toBeGreaterThan(200);
    const streetCarousel = details.getByRole("group", {
      name: "Nearby streets",
    });
    await expect(
      streetCarousel.getByRole("button", { name: "Previous nearby streets" }),
    ).toBeDisabled();
    await expect(streetCarousel).toContainText("105 mapped spaces");
    await expect(streetCarousel).toContainText("1–2 of 3");
    await streetCarousel
      .getByRole("button", { name: "Next nearby streets" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(streetCarousel).toContainText("55 mapped spaces");
    await expect(streetCarousel).toContainText("3–3 of 3");
    await expect(streetCarousel).not.toContainText("160 mapped spaces");
    await expect(
      streetCarousel.getByRole("button", { name: "Next nearby streets" }),
    ).toBeDisabled();
    await details
      .getByText("Parking management zones", { exact: true })
      .click();
    await expect(details).toContainText("Zone 8 · Charlottenburg");
    await expect(details).toContainText("€3.00 per hour");
    const zoneCarousel = details.getByRole("group", {
      name: "Parking management zones",
    });
    await expect(zoneCarousel).toContainText("Zone 9 · Charlottenburg");
    await expect(zoneCarousel).toContainText("€2.00 per hour");
    await expect(
      zoneCarousel.getByRole("button", {
        name: "Next parking management zones",
      }),
    ).toHaveCount(0);
    await details.getByText("Street events", { exact: true }).click();
    await expect(details).toContainText("No event in this sample radius");
    const heights = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
    await details.screenshot({
      path: `/tmp/berlin-${name.toLowerCase().replaceAll(" ", "-")}-details.png`,
    });
    await page.screenshot({
      path: `/tmp/berlin-${name.toLowerCase().replaceAll(" ", "-")}.png`,
    });
    await page
      .getByLabel("Berlin destination")
      .fill("Torstraße 101, Berlin-Mitte");
    await page.getByRole("button", { name: "Check nearby" }).click();
    for (const label of [
      "Nearby streets",
      "Parking management zones",
      "Street events",
    ]) {
      await details.getByText(label, { exact: true }).click();
    }
    await expect(cards.nth(2)).toContainText("Roadwork · Linienstraße");
    const variedHeights = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
    expect(
      Math.max(...variedHeights) - Math.min(...variedHeights),
    ).toBeLessThan(2);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["City Signal", "Street Atlas", "Night Route"]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page
      .getByRole("region", { name: "Explore nearby details" })
      .getByText("Nearby streets", { exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/berlin-${name.toLowerCase().replaceAll(" ", "-")}-mobile.png`,
    });
  }

  await page
    .getByLabel("Berlin destination")
    .fill("Torstraße 101, Berlin-Mitte");
  await page.getByRole("button", { name: "Check nearby" }).click();
  const eventCarousel = page
    .getByRole("region", { name: "Explore nearby details" })
    .getByRole("group", { name: "Street events" });
  await page.getByText("Street events", { exact: true }).click();
  await expect(eventCarousel).toContainText("Roadwork · Linienstraße");
  await expect(eventCarousel).toContainText("Lane closure · Torstraße");
  await page
    .getByRole("region", { name: "Explore nearby details" })
    .screenshot({ path: "/tmp/berlin-two-items-mobile.png" });
  await eventCarousel
    .getByRole("button", { name: "Next street events" })
    .click();
  await expect(eventCarousel).toContainText("Worksite · Rosa-Luxemburg-Straße");
  await page.getByLabel("Items per card").selectOption("3");
  await expect(eventCarousel).toContainText("Roadwork · Linienstraße");
  await expect(eventCarousel).toContainText("Lane closure · Torstraße");
  await expect(eventCarousel).toContainText("Worksite · Rosa-Luxemburg-Straße");
  await expect(
    eventCarousel.getByRole("button", { name: "Next street events" }),
  ).toHaveCount(0);
  await page.getByRole("slider").focus();
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Check nearby" }).click();
  const narrowDetails = page.getByRole("region", {
    name: "Explore nearby details",
  });
  await expect(narrowDetails).toContainText("1 street");
  await expect(narrowDetails).toContainText("1 zone");
  await expect(narrowDetails).toContainText("1 event");
  await expect(page.getByText("210", { exact: true })).toBeVisible();
  await narrowDetails.getByText("Street events", { exact: true }).click();
  await expect(narrowDetails).toContainText("Roadwork · Linienstraße");
  await expect(narrowDetails).toContainText("21 Sep–16 Oct 2026");
  await expect(
    narrowDetails.getByRole("button", { name: "Next street events" }),
  ).toHaveCount(0);
  await narrowDetails.screenshot({
    path: "/tmp/berlin-events-mobile.png",
  });

  await page.getByLabel("Berlin destination").fill("Unknown address");
  await page.getByRole("button", { name: "Check nearby" }).click();
  await expect(page.locator("#demo-error")).toContainText(
    "Choose one of the three sample addresses",
  );
});

test("proposal links scroll smoothly unless reduced motion is preferred", async ({
  page,
}) => {
  await page.goto("/design/proposals");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
  await page.getByRole("link", { name: /Start searching/ }).click();
  await expect(page).toHaveURL(/#search$/);

  await page
    .getByLabel("Berlin destination")
    .fill("Torstraße 101, Berlin-Mitte");
  await page.getByRole("button", { name: "Check nearby" }).click();
  await page.getByRole("link", { name: /Explore all details/ }).click();
  await expect(page).toHaveURL(/#explore-title$/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
});
