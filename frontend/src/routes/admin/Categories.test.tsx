import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "../../test-utils";
import { storeToken, clearToken } from "../../lib/auth";
import type { JwtPayload } from "../../lib/auth";
import Categories from "./Categories";

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
    sub: "3",
    UserID: 3,
    Role: "Administrator",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

const mockCategories = [
  { id: 1, category_name: "Electronics", description: "Electronic devices", icon: "electronics", display_order: 1, status: "Active", created_at: "2026-08-12T00:00:00Z" },
  { id: 2, category_name: "Bags", description: "Bags and backpacks", icon: "bags", display_order: 2, status: "Archived", created_at: "2026-08-12T00:00:00Z" },
];

const mockFetch = vi.fn();

beforeEach(() => {
  clearToken();
  storeToken(fakeJwt(validPayload()));
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
    if (String(url).includes("/categories") && (!opts?.method || opts.method === "GET")) {
      return { ok: true, status: 200, text: async () => JSON.stringify(mockCategories) };
    }
    if (opts?.method === "POST" && String(url).includes("/categories")) {
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: 3, category_name: "Sports", status: "Active" }) };
    }
    if (opts?.method === "DELETE") {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    if (opts?.method === "PATCH") {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({}) };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset window.confirm
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Categories tests                                                  */
/* ------------------------------------------------------------------ */

describe("Categories", () => {
  it("renders the categories table", async () => {
    renderWithProviders(<Categories />);
    expect(await screen.findByText("Manage Categories")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Bags")).toBeInTheDocument();
  });

  it("shows empty state when no categories", async () => {
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/categories") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    renderWithProviders(<Categories />);
    expect(await screen.findByText("No categories yet.")).toBeInTheDocument();
  });

  it("opens create modal when 'Add Category' is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Categories />);
    await screen.findByText("Electronics");

    await user.click(screen.getByRole("button", { name: /Add Category/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add category")).toBeInTheDocument();
  });

  it("creates a new category via POST", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Categories />);
    await screen.findByText("Electronics");

    await user.click(screen.getByRole("button", { name: /Add Category/ }));
    await user.type(screen.getByPlaceholderText("e.g. Electronics"), "Sports Gear");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/categories") && (call[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
    });
  });

  it("opens edit modal when 'Edit' is clicked on a category", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Categories />);
    await screen.findByText("Electronics");

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Edit category #1/)).toBeInTheDocument();
  });

  it("archives a category via DELETE", async () => {
    // Mock window.confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(<Categories />);
    await screen.findByText("Electronics");

    // Electronics is Active, so it has an Archive button
    const archiveButtons = screen.getAllByRole("button", { name: "Archive" });
    await user.click(archiveButtons[0]);

    await waitFor(() => {
      const deleteCall = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/categories/1") && (call[1] as RequestInit)?.method === "DELETE",
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it("restores an archived category via PATCH", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Categories />);
    await screen.findByText("Electronics");

    // Bags is Archived, so it has a Restore button
    const restoreButton = screen.getByRole("button", { name: "Restore" });
    await user.click(restoreButton);

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/categories/2") && (call[1] as RequestInit)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.status).toBe("Active");
    });
  });
});
