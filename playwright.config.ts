import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_USE_SYSTEM_CHROME ? { channel: "chrome" } : {}),
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
