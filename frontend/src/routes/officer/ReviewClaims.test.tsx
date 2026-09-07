import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "../../test-utils";
import { storeToken, clearToken } from "../../lib/auth";
import type { JwtPayload } from "../../lib/auth";
import ReviewClaims from "./ReviewClaims";

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
    sub: "2",
    UserID: 2,
    Role: "Officer",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

const pendingClaim = {
  id: 1,
  lost_item_id: 1,
  found_item_id: 2,
  user_id: 1,
  claim_date: "2026-08-12T10:00:00Z",
  verification_status: "Pending",
  officer_id: null,
  verification_notes: null,
  collection_date: null,
  status: "Active",
};

beforeEach(() => {
  clearToken();
  storeToken(fakeJwt(validPayload()));
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  ReviewClaims tests                                                */
/* ------------------------------------------------------------------ */

describe("ReviewClaims", () => {
  it("renders pending claims", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([pendingClaim]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<ReviewClaims />);
    expect(await screen.findByText("Claim #1")).toBeInTheDocument();
    expect(screen.getByText("Review Claims")).toBeInTheDocument();
  });

  it("shows empty state when no pending claims", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<ReviewClaims />);
    expect(await screen.findByText("No pending claims to review.")).toBeInTheDocument();
  });

  it("opens approve modal when 'Approve Claim' is clicked", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([pendingClaim]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);
    const user = userEvent.setup();

    renderWithProviders(<ReviewClaims />);
    await screen.findByText("Claim #1");

    await user.click(screen.getByRole("button", { name: "Approve Claim" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Approve claim #1/)).toBeInTheDocument();
  });

  it("opens reject modal when 'Reject Claim' is clicked", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([pendingClaim]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);
    const user = userEvent.setup();

    renderWithProviders(<ReviewClaims />);
    await screen.findByText("Claim #1");

    await user.click(screen.getByRole("button", { name: "Reject Claim" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Reject claim #1/)).toBeInTheDocument();
  });

  it("sends verify POST on approve confirm", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims/1/verify") && opts?.method === "POST") {
        return { ok: true, status: 200, text: async () => JSON.stringify(pendingClaim) };
      }
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([pendingClaim]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);
    const user = userEvent.setup();

    renderWithProviders(<ReviewClaims />);
    await screen.findByText("Claim #1");

    await user.click(screen.getByRole("button", { name: "Approve Claim" }));
    // Default result in modal is "Approved"
    await user.click(screen.getByRole("button", { name: /Confirm Approved/ }));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/claims/1/verify") && (call[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.result).toBe("Approved");
    });
  });

  it("sends verify POST on reject confirm", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (String(url).includes("/claims/1/verify") && opts?.method === "POST") {
        return { ok: true, status: 200, text: async () => JSON.stringify(pendingClaim) };
      }
      if (String(url).includes("/claims") && (!opts?.method || opts.method === "GET")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([pendingClaim]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    });
    vi.stubGlobal("fetch", mockFetch);
    const user = userEvent.setup();

    renderWithProviders(<ReviewClaims />);
    await screen.findByText("Claim #1");

    await user.click(screen.getByRole("button", { name: "Reject Claim" }));
    // The modal's decision dropdown should be set to "Rejected"
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "Rejected");

    await user.click(screen.getByRole("button", { name: /Confirm Rejected/ }));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/claims/1/verify") && (call[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.result).toBe("Rejected");
    });
  });
});
