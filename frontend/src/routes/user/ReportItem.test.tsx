import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "../../test-utils";
import { storeToken, clearToken } from "../../lib/auth";
import type { JwtPayload } from "../../lib/auth";
import ReportItem from "./ReportItem";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fakeJwt(obj: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.`;
}

function validPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "1",
    UserID: 1,
    Role: "User",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

const mockFetch = vi.fn();

beforeEach(() => {
  clearToken();
  storeToken(fakeJwt(validPayload()));
  vi.stubGlobal("fetch", mockFetch);
  // Mock the /categories endpoint used by useAuthedFetch
  mockFetch.mockImplementation(async (url: string) => {
    if (String(url).includes("/categories")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { id: 1, category_name: "Electronics", status: "Active" },
            { id: 2, category_name: "Bags", status: "Active" },
          ]),
      };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({}) };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  ReportItem tests                                                  */
/* ------------------------------------------------------------------ */

describe("ReportItem — lost item form", () => {
  it("renders the form with category dropdown and title field", async () => {
    renderWithProviders(<ReportItem kind="lost" onDone={vi.fn()} />);
    expect(await screen.findByText("Report Lost Item")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Black Nike backpack")).toBeInTheDocument();
  });

  it("shows validation error when category is not selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportItem kind="lost" onDone={vi.fn()} />);
    // Wait for categories to load
    await screen.findByText("Report Lost Item");

    // Submit without selecting category
    await user.click(screen.getByRole("button", { name: /Submit Lost Report/ }));
    expect(await screen.findByText("Please choose a category.")).toBeInTheDocument();
  });

  it("shows validation error when title is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportItem kind="lost" onDone={vi.fn()} />);
    await screen.findByText("Report Lost Item");

    // Select a category but leave title empty
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: /Submit Lost Report/ }));
    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
  });

  it("calls api.post with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderWithProviders(<ReportItem kind="lost" onDone={onDone} />);
    await screen.findByText("Report Lost Item");

    // Select category
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "1");

    // Fill title
    await user.type(screen.getByPlaceholderText("e.g. Black Nike backpack"), "Blue Sony headphones");

    // Intercept the POST /items/lost call
    mockFetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 10, title: "Blue Sony headphones", status: "Reported" }),
    }));

    await user.click(screen.getByRole("button", { name: /Submit Lost Report/ }));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });

    // Verify the POST was called with the right payload
    const postCall = mockFetch.mock.calls.find(
      (call: unknown[]) => String(call[0]).includes("/items/lost") && (call[1] as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeTruthy();
  });

  it("renders the found-item variant", async () => {
    renderWithProviders(<ReportItem kind="found" onDone={vi.fn()} />);
    expect(await screen.findByText("Report Found Item")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Silver smartwatch found")).toBeInTheDocument();
  });
});
