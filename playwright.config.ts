import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a production build on port 3210 with an isolated local data file
 * (seeded automatically in demo mode). Build first: `npm run build`.
 */
const PORT = 3210;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Uses the locally installed Chrome when Playwright's bundled browser is unavailable.
    channel: process.env.PW_CHANNEL || undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DEMO_MODE: "true",
      LOCAL_DATA_FILE: ".data/e2e-db.json",
      SESSION_SECRET: "e2e-only-session-secret-0123456789abcdef",
      NASA_API_KEY: "DEMO_KEY",
    },
  },
});
