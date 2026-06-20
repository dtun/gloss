import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;

/**
 * E2E config. The web server is the real production server (built frontend +
 * API) running with GLOSS_FAKE_LLM=1, so the suite is deterministic and needs
 * no API key.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      GLOSS_FAKE_LLM: "1",
    },
  },
});
