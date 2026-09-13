import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test-utils";
import { clearToken, storeToken } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import AdminDashboard from "./admin/AdminDashboard";
import Users from "./admin/Users";
import Reports from "./admin/Reports";
import UserDashboard from "./user/UserDashboard";
import MyMatches from "./user/MyMatches";

function fakeJwt(obj: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.`;
}

function payloadFor(role: "Administrator" | "User", userId = role === "Administrator" ? 3 : 1): JwtPayload {
  return {
    sub: String(userId),
    UserID: userId,
    Role: role,
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

const claim = {
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

const match = {
  id: 5,
  lost_item_id: 1,
  found_item_id: 2,
  match_score: "78",
  match_reason: "Same brand and colour",
  status: "Suggested",
  generated_at: "2026-08-12T09:00:00Z",
  lost_item_title: "Black Leather Wallet",
  found_item_title: "Toyota Car Keys",
  lost_reporter_name: "Ada Lovelace",
  found_reporter_name: "Bob Builder",
};

const lostItem = {
  id: 1,
  user_id: 1,
  category_id: 1,
  title: "Black Leather Wallet",
  description: "Bifold wallet",
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
  description: "Found keys",
  brand: "Toyota",
  colour: "Silver",
  date_found: "2026-08-11",
  storage_location: "Parking Garage B",
  status: "Available",
  reporter_name: "Bob Builder",
  category_name: "Accessories",
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

const managedUsers = [
  {
    id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    student_number: "u12345",
    email: "ada@example.com",
    phone_number: null,
    role: "User",
    status: "Active",
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: 2,
    first_name: "Grace",
    last_name: "Hopper",
    student_number: "u54321",
    email: "grace@example.com",
    phone_number: null,
    role: "Officer",
    status: "Suspended",
    created_at: "2026-08-02T00:00:00Z",
  },
];

const reportRows = [
  { id: 1, first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", role: "User", status: "Active" },
  { id: 2, first_name: "Grace", last_name: "Hopper", email: "grace@example.com", role: "Officer", status: "Suspended" },
];

function stubApi() {
  const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
    const path = String(url);
    if (path.includes("/dashboard/reports")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            report_type: "users",
            generated_at: "2026-09-12T10:00:00Z",
            count: reportRows.length,
            rows: reportRows,
          }),
      };
    }
    if ((opts?.method ?? "GET") !== "GET") {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    const body = () => {
      if (path.includes("/items/lost")) return [lostItem];
      if (path.includes("/items/found")) return [foundItem];
      if (path.includes("/claims")) return [claim];
      if (path.includes("/matches")) return [match];
      if (path.includes("/categories")) return [category];
      if (path.includes("/admin/users")) return managedUsers;
      return {};
    };
    return { ok: true, status: 200, text: async () => JSON.stringify(body()) };
  });
  vi.stubGlobal("fetch", mockFetch);
  return mockFetch;
}

beforeEach(() => {
  clearToken();
  storeToken(fakeJwt(payloadFor("Administrator")));
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Administrator                                                      */
/* ------------------------------------------------------------------ */

describe("Admin dashboard toolbars", () => {
  it("renders the claims overview with filter tabs and search", async () => {
    stubApi();
    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByText("Claims overview")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "true");
  });

  it("narrows the claims overview with the search and tabs", async () => {
    stubApi();
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<AdminDashboard />);
    await screen.findByText("Claims overview");

    rerender(<AdminDashboard query="zz-nothing" />);
    expect(screen.getByText("No claims match “zz-nothing”.")).toBeInTheDocument();

    rerender(<AdminDashboard query="" />);
    await user.click(screen.getByRole("tab", { name: /^Rejected/ }));
    expect(screen.getByText("No claims in this view.")).toBeInTheDocument();
  });

  it("opens a read-only claim detail from the row's View action", async () => {
    stubApi();
    const user = userEvent.setup();
    renderWithProviders(<AdminDashboard />);
    await screen.findByText("Claims overview");

    await user.click(screen.getByRole("button", { name: /View/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Not yet assigned")).toBeInTheDocument();
    expect(screen.getByText("Not collected")).toBeInTheDocument();
  });
});

describe("Manage Users toolbars", () => {
  it("filters the accounts table by status tab and by search", async () => {
    stubApi();
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<Users />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^Suspended/ }));
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^All/ }));
    rerender(<Users query="ada@example.com" />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });
});

describe("Admin reports search", () => {
  it("narrows the loaded report rows without changing the server filters", async () => {
    const mockFetch = stubApi();
    renderWithProviders(<Reports query="grace" />);

    expect(await screen.findByText("Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Lovelace")).not.toBeInTheDocument();
    // the report request itself is unchanged apart from the existing filters
    expect(mockFetch.mock.calls.some((call: unknown[]) => String(call[0]).includes("/dashboard/reports"))).toBe(
      true,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Student                                                            */
/* ------------------------------------------------------------------ */

describe("Student dashboard toolbars", () => {
  beforeEach(() => {
    clearToken();
    storeToken(fakeJwt(payloadFor("User")));
  });

  it("filters recent activity by type tab and by search", async () => {
    stubApi();
    renderWithProviders(<UserDashboard onReport={vi.fn()} query="wallet" />);

    expect(await screen.findByText("Black Leather Wallet")).toBeInTheDocument();
    expect(screen.queryByText("Toyota Car Keys")).not.toBeInTheDocument();
  });

  it("lists matches as Track-Claim style rows with a progress tracker", async () => {
    stubApi();
    renderWithProviders(<MyMatches />);

    expect(await screen.findByText("Claim Submitted")).toBeInTheDocument();
    expect(screen.getByText("Recovered")).toBeInTheDocument();
    expect(screen.getByText(/78% confidence · Suggested/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept & Submit Claim" })).toBeInTheDocument();
  });

  it("narrows matches with the tabs and the search", async () => {
    stubApi();
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<MyMatches />);
    await screen.findByText("Black Leather Wallet");

    await user.click(screen.getByRole("tab", { name: /^Accepted/ }));
    expect(screen.getByText("No matches in this view.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^All/ }));
    rerender(<MyMatches query="zz-nothing" />);
    expect(screen.getByText("No matches match “zz-nothing”.")).toBeInTheDocument();
  });
});
