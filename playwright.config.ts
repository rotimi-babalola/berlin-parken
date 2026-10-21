import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";
const localUrl = `http://127.0.0.1:${port}`;
// Set for the post-deploy run; the local server is not needed then.
const remoteUrl = process.env.PLAYWRIGHT_BASE_URL || undefined;
const baseURL = remoteUrl ?? localUrl;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_USE_SYSTEM_CHROME ? { channel: "chrome" } : {}),
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: remoteUrl
    ? undefined
    : {
        command: `pnpm start --hostname 127.0.0.1 --port ${port}`,
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
