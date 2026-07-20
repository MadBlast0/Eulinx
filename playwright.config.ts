import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright E2E configuration for Eulinx.
 *
 * Docs (`Docs/16-testing`, RegressionTesting / E2E) mandate Playwright E2E
 * against the Tauri shell. This config runs the browser-mode build of the app
 * (the same React bundle the Tauri webview loads) against the Vite dev server,
 * which is CI-friendly and does not require a running Tauri process.
 *
 * NOTE: Playwright browsers must be installed once with `npx playwright install`
 * before running (`pnpm test:e2e`). CI should run that step first.
 */

const PORT = 1420
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
