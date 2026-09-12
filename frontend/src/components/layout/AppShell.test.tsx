import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../../test-utils";
import AppShell from "./AppShell";
import { storeToken, clearToken, getAuthSession, type JwtPayload } from "../../lib/auth";

/*
 * AppShell is the single shared shell for all three portals, and the design
 * system retrofit changed its active/hover treatment (§13). These tests pin
 * the behaviour the retrofit must not have broken: an ink pill for the
 * current destination, a muted inactive state, and the session identity.
 */

function fakeJwt(obj: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.`;
}

function signIn(overrides: Partial<JwtPayload> = {}) {
  storeToken(
    fakeJwt({
      sub: "1",
      UserID: 1,
      Role: "Officer",
      FirstName: "Ada",
      LastName: "Lovelace",
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    }),
  );
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "reports", label: "Reports", icon: "assessment" },
];

function renderShell(active = "dashboard", onNavigate = vi.fn()) {
  return renderWithProviders(
    <AppShell portalTitle="Lost & Found Officer" nav={NAV} active={active} onNavigate={onNavigate}>
      <p>Portal content</p>
    </AppShell>,
  );
}

beforeEach(() => {
  clearToken();
});

describe("AppShell", () => {
  it("renders the portal title, the active page title and its children", () => {
    signIn();
    renderShell("reports");
    expect(screen.getByText("Lost & Found Officer")).toBeInTheDocument();
    // Topbar page title follows the active nav item
    expect(screen.getByRole("heading", { level: 2, name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("Portal content")).toBeInTheDocument();
  });

  it("marks the active destination as the current page", () => {
    signIn();
    renderShell("reports");
    const active = screen.getByRole("button", { name: /Reports/ });
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("renders the active nav item as an ink pill (design system 13)", () => {
    signIn();
    renderShell("dashboard");
    const active = screen.getByRole("button", { name: /Dashboard/ });
    expect(active.className).toContain("bg-ink");
    expect(active.className).toContain("text-white");
    expect(active.className).toContain("rounded-full");
    expect(active.className).not.toContain("bg-brand");
  });

  it("renders inactive nav items muted with the nav-hover fill", () => {
    signIn();
    renderShell("dashboard");
    const inactive = screen.getByRole("button", { name: /Reports/ });
    expect(inactive.className).toContain("text-muted");
    expect(inactive.className).toContain("hover:bg-nav-hover");
    expect(inactive).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate with the nav id when a destination is clicked", async () => {
    signIn();
    const onNavigate = vi.fn();
    renderShell("dashboard", onNavigate);
    await userEvent.click(screen.getByRole("button", { name: /Reports/ }));
    expect(onNavigate).toHaveBeenCalledWith("reports");
  });

  it("shows the signed-in user's name, initials and role from the session", () => {
    signIn();
    renderShell();
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Officer").length).toBeGreaterThan(0);
  });

  it("falls back to a Guest identity with no session", () => {
    renderShell();
    expect(screen.getAllByText("Guest").length).toBeGreaterThan(0);
  });

  it("clears the session when Logout is clicked", async () => {
    signIn();
    expect(getAuthSession()).not.toBeNull();
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: /Logout/ }));
    expect(getAuthSession()).toBeNull();
    expect(screen.getAllByText("Guest").length).toBeGreaterThan(0);
  });
});
