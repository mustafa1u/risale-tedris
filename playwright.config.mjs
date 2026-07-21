import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4322";

export default defineConfig({
  testDir: "./browser-tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "line",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev:web -- --port 4322",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 360_000
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" })
      }
    }
  ]
});
