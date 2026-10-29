/**
 * TRACE E2E — core happy paths (Playwright, issue: add E2E testing).
 *
 * Runs against the real docker compose stack: nginx-served React bundle on
 * :5173 talking to the FastAPI backend on :8000 with the idempotent demo
 * seed (seeded logins in README/Tutorial — do NOT change seed data here).
 *
 * Covered: login → student portal, registration, report a lost item and see
 * it on the dashboard, and the seeded suggested match on My Matches.
 */

import { expect, test, type Page } from "@playwright/test";

/** Demo User account (role User) — seeded by backend/seed.py. */
const USER_EMAIL = "ada@example.com";
const USER_PASSWORD = "SuperSecret1!";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email Address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log In", exact: true }).click();
}

test.describe("Auth flow", () => {
  test("seeded user can log in and lands in the student portal", async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD);

    // Login success screen shows the decoded Role claim (DoD proof).
    await expect(page.getByRole("heading", { name: "Login Successful" })).toBeVisible();
    await expect(page.getByText("User", { exact: true }).first()).toBeVisible();

    // Then the portal: explicit button beats the 4s auto-redirect.
    await page.getByRole("button", { name: /Go to Dashboard/ }).click();
    await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
    await expect(page.getByText("Student Portal")).toBeVisible();
  });

  test("new user can register and reaches the success screen", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("First Name", { exact: true }).fill("Eff");
    await page.getByLabel("Last Name", { exact: true }).fill("Two");
    await page.getByLabel("Email Address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("E2ePassword1");
    await page.getByLabel("Confirm Password", { exact: true }).fill("E2ePassword1");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Registration Successful" }),
    ).toBeVisible();

    // Sanity: the created account can actually sign in.
    await login(page, email, "E2ePassword1");
    await expect(page.getByRole("heading", { name: "Login Successful" })).toBeVisible();
  });
});

test.describe("Student portal", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.getByRole("button", { name: /Go to Dashboard/ }).click();
    await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  });

  test("user can report a lost item and see it in Recent Activity", async ({ page }) => {
    const title = `E2E lost item ${Date.now()}`;

    // Sidebar nav and the dashboard CTA share this label — either works; both
    // navigate to the report form.
    await page.getByRole("button", { name: "Report Lost Item" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Report Lost Item", level: 1 }),
    ).toBeVisible();

    // The report form's <Field> labels are not wired to the inputs, so the
    // assertions target the main content area by role/placeholder instead.
    await page
      .getByRole("main")
      .getByRole("combobox")
      .selectOption({ label: "Bags" });
    await page.getByPlaceholder("e.g. Black Nike backpack").fill(title);
    await page
      .getByPlaceholder("Colour, size, markings, anything that helps identify it…")
      .fill("Black canvas tote with E2E swipe tag");
    await page.locator("main input[type=date]").fill("2026-10-27");
    await page.getByPlaceholder("e.g. Library, 3rd floor").fill("Library, E2E floor");
    await page
      .getByRole("button", { name: "Submit Lost Report", exact: true })
      .click();

    // ReportItem navigates back to the dashboard after the toast.
    await expect(
      page.getByText("Your lost item was reported — matching is running."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();

    // The report is the newest row (dashboard sorts newest first) and visible
    // without scrolling below the fold in the first page of Recent Activity.
    await expect(page.getByText(title)).toBeVisible();
  });

  test("seeded suggested match is listed on My Matches", async ({ page }) => {
    await page.getByRole("button", { name: "My Matches" }).first().click();
    await expect(
      page.getByRole("heading", { name: "My Matches", level: 1 }),
    ).toBeVisible();

    // The deliberately-matching seeded pair must surface a match row and a
    // Suggested action (see backend/seed.py EXPECTED_MATCHING_PAIRS).
    await expect(page.getByText("Black Nike backpack").first()).toBeVisible();
    await expect(page.getByText(/100% confidence/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Accept & Submit Claim" }).first(),
    ).toBeVisible();
  });
});
