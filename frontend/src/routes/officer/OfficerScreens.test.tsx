import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import { clearToken, storeToken } from "../../lib/auth";
import type { JwtPayload } from "../../lib/auth";
import OfficerDashboard from "./OfficerDashboard";
import VerifyReports from "./VerifyReports";
import Collections from "./Collections";
import StatusUpdate from "./StatusUpdate";

/* ------------------------------------------------------------------ */
/*  Helpers (same shape as the other route tests)                      */
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

const lostItem = {
  id: 1,
  user_id: 1,
  category_id: 1,
  title: "Black Leather Wallet",
  description: "Black bifold wallet with two credit cards",
  brand: "Fossil",
  colour: "Black",
  date_lost: "2026-08-10",
  location_lost: "Main Terminal",
  status: "Reported",
  reporter_name: "Ada Lovelace",
  category_name: "Accessories",
};

const foundItem = {
  id: 2,
  user_id: 2,
  category_id: 2,
  title: "Toyota Car Keys",
  description: "Found a set of Toyota car keys on a bench",
  brand: "Toyota",
  colour: "Silver",
  date_found: "2026-08-11",
  storage_location: "Parking Garage B",
  status: "Available",
  reporter_name: "Bob Builder",
  category_name: "Accessories",
};

const pendingClaim = {
  id: 10,
  lost_item_id: 1,
  found_item_id: 2,
  user_id: 1,
  claim_date: "2026-08-12T10:00:00Z",
  verification_status: "Pending",
  officer_id: null,
  verification_notes: null,
  collection_date: null,
  status: "Active",
  lost_item_title: "Black Leather Wallet",
  found_item_title: "Toyota Car Keys",
  claimant_name: "Ada Lovelace",
  officer_name: null,
};

const approvedClaim = { ...pendingClaim, id: 11, verification_status: "Approved" };

const match = {
  id: 5,
  lost_item_id: 1,
  found_item_id: 2,
  match_score: "82.5",
  match_reason: "Same brand and colour",
  status: "Suggested",
  generated_at: "2026-08-12T09:00:00Z",
};

const category = {
  id: 1,
  category_name: "Accessories",
  description: "Bags and wallets",
  icon: "bags",
  display_order: 1,
  status: "Active",
  created_at: "2026-08-01T00:00:00Z",
};

/** Routes every GET the officer screens make. */
function stubApi(claims: object[] = [pendingClaim]) {
  const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
    const path = String(url);
    const method = opts?.method ?? "GET";
    const body = () => {
      if (path.includes("/items/lost")) return [lostItem];
      if (path.includes("/items/found")) return [foundItem];
      if (path.includes("/claims")) return claims;
      if (path.includes("/matches")) return [match];
      if (path.includes("/categories")) return [category];
      return {};
    };
    if (method === "GET") return { ok: true, status: 200, text: async () => JSON.stringify(body()) };
    return { ok: true, status: 200, text: async () => JSON.stringify({}) };
  });
  vi.stubGlobal("fetch", mockFetch);
  return mockFetch;
}

beforeEach(() => {
  clearToken();
  storeToken(fakeJwt(validPayload()));
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Officer dashboard                                                  */
/* ------------------------------------------------------------------ */

describe("OfficerDashboard", () => {
  it("renders the verification queue, summary cards and active claims", async () => {
    stubApi();
    renderWithProviders(<OfficerDashboard onNavigate={vi.fn()} />);

    expect(await screen.findByText("Verification Queue")).toBeInTheDocument();
    // shown twice: the verification queue row and the active-claims table row
    expect(screen.getAllByText("Black Leather Wallet").length).toBeGreaterThan(0);
    expect(screen.getByText("Reported by Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Pending Verifications")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "true");
    // match score joined from /matches by the lost/found pair
    expect(screen.getByText("83%")).toBeInTheDocument();
  });

  it("narrows the active claims table with its filter tabs", async () => {
    stubApi();
    const user = userEvent.setup();
    renderWithProviders(<OfficerDashboard onNavigate={vi.fn()} />);
    await screen.findByText("Verification Queue");

    await user.click(screen.getByRole("tab", { name: /^Approved/ }));
    expect(screen.getByText("No claims in this view yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^All/ }));
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("narrows the active claims table with the topbar search", async () => {
    stubApi();
    renderWithProviders(<OfficerDashboard query="zz-nothing" onNavigate={vi.fn()} />);
    expect(await screen.findByText("No claims match “zz-nothing”.")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Verify reports                                                     */
/* ------------------------------------------------------------------ */

describe("VerifyReports", () => {
  it("renders both report types and filters them with the tabs", async () => {
    stubApi();
    const user = userEvent.setup();
    renderWithProviders(<VerifyReports />);

    expect(await screen.findByText("Black Leather Wallet")).toBeInTheDocument();
    expect(screen.getByText("Toyota Car Keys")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^Lost/ }));
    expect(screen.getByText("Black Leather Wallet")).toBeInTheDocument();
    expect(screen.queryByText("Toyota Car Keys")).not.toBeInTheDocument();
  });

  it("narrows reports with the topbar search", async () => {
    stubApi();
    renderWithProviders(<VerifyReports query="toyota" />);
    expect(await screen.findByText("Toyota Car Keys")).toBeInTheDocument();
    expect(screen.queryByText("Black Leather Wallet")).not.toBeInTheDocument();
  });

  it("opens the status modal for a report", async () => {
    stubApi();
    const user = userEvent.setup();
    renderWithProviders(<VerifyReports query="wallet" />);
    await screen.findByText("Black Leather Wallet");

    await user.click(screen.getByRole("button", { name: "Verify Report" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Update status — Black Leather Wallet")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Approve collections                                                */
/* ------------------------------------------------------------------ */

describe("Collections", () => {
  it("lists approved claims and filters them with the tabs", async () => {
    stubApi([approvedClaim]);
    const user = userEvent.setup();
    renderWithProviders(<Collections />);

    expect(await screen.findByText("Approve Collections")).toBeInTheDocument();
    expect(screen.getByText("Black Leather Wallet")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^Collected/ }));
    expect(screen.getByText("No approved claims in this view.")).toBeInTheDocument();
  });

  it("narrows collections with the topbar search", async () => {
    stubApi([approvedClaim]);
    renderWithProviders(<Collections query="zz-nothing" />);
    expect(await screen.findByText("No collections match “zz-nothing”.")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Update item status                                                 */
/* ------------------------------------------------------------------ */

describe("StatusUpdate", () => {
  it("renders the item table with status controls and a category filter", async () => {
    stubApi();
    renderWithProviders(<StatusUpdate />);

    expect(await screen.findByText("Items Requiring Status Review")).toBeInTheDocument();
    expect(screen.getByText("Black Leather Wallet")).toBeInTheDocument();
    expect(screen.getByText("Toyota Car Keys")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by category" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Update status for Black Leather Wallet" })).toBeInTheDocument();
  });

  it("sends a PATCH when the status control changes", async () => {
    const mockFetch = stubApi();
    const user = userEvent.setup();
    renderWithProviders(<StatusUpdate />);
    await screen.findByText("Black Leather Wallet");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Update status for Black Leather Wallet" }),
      "Matched",
    );

    await waitFor(() => {
      const patch = mockFetch.mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes("/items/lost/1") && (call[1] as RequestInit)?.method === "PATCH",
      );
      expect(patch).toBeTruthy();
    });
  });

  it("narrows items with the tabs and the search", async () => {
    stubApi();
    const user = userEvent.setup();
    renderWithProviders(<StatusUpdate query="toyota" />);

    expect(await screen.findByText("Toyota Car Keys")).toBeInTheDocument();
    expect(screen.queryByText("Black Leather Wallet")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^Lost/ }));
    expect(screen.getByText("No items match “toyota”.")).toBeInTheDocument();
  });
});
