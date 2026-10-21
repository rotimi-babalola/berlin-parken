import { expect, test } from "@playwright/test";

// Runs only against a deployed URL, after a production deployment succeeds.
// These checks use the real geocoder, parking WFS and routing services; the
// mocked tests in the other specs stay on pull requests.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  "Production checks need PLAYWRIGHT_BASE_URL",
);

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("serves the homepage, area guides, robots and sitemap", async ({
  page,
  request,
}) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Street parking",
  );

  for (const slug of ["mitte", "kreuzberg", "charlottenburg"]) {
    const response = await page.goto(`/parking/${slug}`);
    expect(response?.status(), slug).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/parking/${slug}$`),
    );
  }

  const unknown = await page.goto("/parking/not-a-real-area");
  expect(unknown?.status()).toBe(404);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("/parking/mitte");
});

test("runs a real search and shows first area, walk estimate and handoff links", async ({
  page,
}) => {
  const parkingStatuses: number[] = [];
  const walkStatuses: number[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/parking?"))
      parkingStatuses.push(response.status());
    if (response.url().includes("/api/walk?"))
      walkStatuses.push(response.status());
  });

  await page.goto("/");
  const address = page.getByRole("combobox", { name: "Destination address" });
  await address.fill("Alexanderplatz");
  await page
    .getByRole("option", { name: /Alexanderplatz/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Check nearby streets" }).click();
  await page.waitForURL(/\/results\?/);

  await expect(page.getByRole("heading", { name: /First area:/ })).toBeVisible({
    timeout: 45_000,
  });
  await expect(
    page.getByRole("link", { name: /Drive to this area/ }).first(),
  ).toHaveAttribute("href", /google\.com\/maps\/dir/);
  await expect(
    page.getByRole("link", { name: /Walk from here to the address/ }).first(),
  ).toHaveAttribute("href", /openstreetmap\.org\/directions/);
  await expect(
    page
      .getByText(
        /Estimated walk to address: \d+ m · about \d+ min|Walk to address: \d+ m straight line/,
      )
      .first(),
  ).toBeVisible({ timeout: 20_000 });

  expect(parkingStatuses.length).toBeGreaterThan(0);
  expect(parkingStatuses.every((status) => status < 500)).toBe(true);
  expect(walkStatuses.every((status) => status < 500)).toBe(true);
});

test("area guide starts a real search", async ({ page }) => {
  await page.goto("/parking/mitte");
  await page.getByRole("button", { name: "Check parking in Mitte" }).click();
  await page.waitForURL(/\/results\?/);

  const url = new URL(page.url());
  expect(url.searchParams.get("label")).toBe("Mitte, Berlin");
  expect(url.searchParams.get("radius")).toBe("500");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mitte, Berlin" }),
  ).toBeVisible();
  await expect(
    page.getByText(/mapped spaces around Mitte, Berlin/),
  ).toBeVisible({ timeout: 45_000 });
});
