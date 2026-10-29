import { defineConfig } from "@playwright/test";

/**
 * Playwright E2E — runs against the running docker compose stack
 * (frontend on :5173, backend on :8000). Bring the stack up first:
 *
 *   make demo        # full stack + idempotent seed (provides the logins below)
 *   make test-e2e    # run this suite
 *
 * The stack is NOT auto-started by Playwright — `make test-e2e` verifies it
 * is healthy before invoking the runner, and fails loudly if it isn't.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
});
