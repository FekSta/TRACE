import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import ProfileModal from "./ProfileModal";
import { storeToken, clearToken, type JwtPayload } from "../../lib/auth";

/*
 * Self-service profile modal: pre-filled from GET /auth/me, saved with
 * PATCH /auth/me, and — critically — it must never expose or send a Role.
 */

function fakeJwt(obj: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.`;
}

const PROFILE = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  student_number: "s1234567",
  email: "ada@example.com",
  phone_number: "+27123456789",
  role: "User",
  status: "Active",
  created_at: "2026-08-12T20:45:12Z",
};

function signIn(overrides: Partial<JwtPayload> = {}) {
  storeToken(
    fakeJwt({
      sub: "1",
      UserID: 1,
      Role: "User",
      FirstName: "Ada",
      LastName: "Lovelace",
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    }),
  );
}

beforeEach(() => {
  clearToken();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("ProfileModal", () => {
  it("pre-fills the signed-in user's details from GET /auth/me", async () => {
    signIn();
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(PROFILE),
    }));
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<ProfileModal open onClose={vi.fn()} />);

    expect(await screen.findByDisplayValue("ada@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ada")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+27123456789")).toBeInTheDocument();
  });

  it("has no Role field", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(PROFILE) })),
    );

    renderWithProviders(<ProfileModal open onClose={vi.fn()} />);
    await screen.findByDisplayValue("ada@example.com");

    expect(screen.queryByText("Role")).not.toBeInTheDocument();
    expect(document.querySelector('select[name="role"], input[name="role"]')).toBeNull();
  });

  it("saves edits with PATCH /auth/me and never sends a role", async () => {
    signIn();
    const mockFetch = vi.fn(async (_url: string, opts?: RequestInit) => {
      const body = opts?.method === "PATCH" ? JSON.parse(String(opts.body)) : PROFILE;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ...PROFILE, ...body }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    const onClose = vi.fn();
    renderWithProviders(<ProfileModal open onClose={onClose} />);
    await screen.findByDisplayValue("ada@example.com");

    const first = screen.getByDisplayValue("Ada");
    await userEvent.clear(first);
    await userEvent.type(first, "Grace");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const patchCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "PATCH");
    expect(patchCall).toBeTruthy();
    const sent = JSON.parse(String((patchCall![1] as RequestInit).body));
    expect(sent.first_name).toBe("Grace");
    expect(sent).not.toHaveProperty("role");
  });

  it("offers a change-password section", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(PROFILE) })),
    );

    renderWithProviders(<ProfileModal open onClose={vi.fn()} />);
    await screen.findByDisplayValue("ada@example.com");

    expect(screen.getByText("Change password")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });

  it("blocks a mismatched confirmation without calling the API", async () => {
    signIn();
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(PROFILE),
    }));
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<ProfileModal open onClose={vi.fn()} />);
    await screen.findByDisplayValue("ada@example.com");

    await userEvent.type(screen.getByLabelText("Current password"), "SuperSecret1!");
    await userEvent.type(screen.getByLabelText("New password"), "BrandNewPass1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "DifferentPass1!");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("New passwords do not match")).toBeInTheDocument();
    expect(mockFetch.mock.calls.some(([, opts]) => opts?.method === "POST")).toBe(false);
  });

  it("posts the password change to /auth/me/password without a role", async () => {
    signIn();
    const mockFetch = vi.fn(async (url: string, opts?: RequestInit) => {
      const status = opts?.method === "POST" && String(url).includes("/auth/me/password") ? 204 : 200;
      return {
        ok: true,
        status,
        text: async () => (status === 204 ? "" : JSON.stringify(PROFILE)),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<ProfileModal open onClose={vi.fn()} />);
    await screen.findByDisplayValue("ada@example.com");

    await userEvent.type(screen.getByLabelText("Current password"), "SuperSecret1!");
    await userEvent.type(screen.getByLabelText("New password"), "BrandNewPass1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "BrandNewPass1!");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password updated.")).toBeInTheDocument();

    const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    expect(postCall).toBeTruthy();
    expect(String(postCall![0])).toContain("/auth/me/password");
    const sent = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(sent).toEqual({ current_password: "SuperSecret1!", new_password: "BrandNewPass1!" });
    expect(sent).not.toHaveProperty("role");
  });
});
