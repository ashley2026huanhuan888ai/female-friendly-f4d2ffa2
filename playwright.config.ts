import { defineConfig, devices } from "@playwright/test";

const hasBaseUrl = Boolean(process.env.E2E_BASE_URL);
const hasLocalSupabaseEnv = Boolean(
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY) &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer:
    !hasBaseUrl && hasLocalSupabaseEnv
      ? {
          command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        }
      : undefined,
});
