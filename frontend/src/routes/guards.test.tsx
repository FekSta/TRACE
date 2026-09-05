import { screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderWithProviders } from "../test-utils";
import { RequireRole } from "./guards";
import { storeToken, clearToken } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

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

beforeEach(() => {
  clearToken();
});

/* ------------------------------------------------------------------ */
/*  RequireRole tests                                                 */
/* ------------------------------------------------------------------ */

describe("RequireRole — User role", () => {
  it("renders children when role matches", () => {
    storeToken(fakeJwt(validPayload({ Role: "User" })));
    renderWithProviders(
      <RequireRole roles={["User"]}>
        <div>User Portal Content</div>
      </RequireRole>,
    );
    expect(screen.getByText("User Portal Content")).toBeInTheDocument();
  });

  it("does not render Officer content when role is User", () => {
    storeToken(fakeJwt(validPayload({ Role: "User" })));
    renderWithProviders(
      <RequireRole roles={["Officer"]}>
        <div>Officer Portal</div>
      </RequireRole>,
    );
    expect(screen.queryByText("Officer Portal")).not.toBeInTheDocument();
  });

  it("redirects to /login when no session", () => {
    renderWithProviders(
      <RequireRole roles={["User"]}>
        <div>Protected</div>
      </RequireRole>,
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });
});

describe("RequireRole — Officer role", () => {
  it("renders Officer portal when role is Officer", () => {
    storeToken(fakeJwt(validPayload({ Role: "Officer" })));
    renderWithProviders(
      <RequireRole roles={["Officer", "Administrator"]}>
        <div>Officer Portal Content</div>
      </RequireRole>,
    );
    expect(screen.getByText("Officer Portal Content")).toBeInTheDocument();
  });

  it("renders Officer portal when role is Administrator (superset)", () => {
    storeToken(fakeJwt(validPayload({ Role: "Administrator" })));
    renderWithProviders(
      <RequireRole roles={["Officer", "Administrator"]}>
        <div>Officer Portal Content</div>
      </RequireRole>,
    );
    expect(screen.getByText("Officer Portal Content")).toBeInTheDocument();
  });

  it("redirects User away from Officer-only portal", () => {
    storeToken(fakeJwt(validPayload({ Role: "User" })));
    renderWithProviders(
      <RequireRole roles={["Officer", "Administrator"]}>
        <div>Officer Portal Content</div>
      </RequireRole>,
    );
    expect(screen.queryByText("Officer Portal Content")).not.toBeInTheDocument();
  });
});

describe("RequireRole — Administrator role", () => {
  it("renders Admin portal when role is Administrator", () => {
    storeToken(fakeJwt(validPayload({ Role: "Administrator" })));
    renderWithProviders(
      <RequireRole roles={["Administrator"]}>
        <div>Admin Portal Content</div>
      </RequireRole>,
    );
    expect(screen.getByText("Admin Portal Content")).toBeInTheDocument();
  });

  it("redirects Officer away from Admin-only portal", () => {
    storeToken(fakeJwt(validPayload({ Role: "Officer" })));
    renderWithProviders(
      <RequireRole roles={["Administrator"]}>
        <div>Admin Portal Content</div>
      </RequireRole>,
    );
    expect(screen.queryByText("Admin Portal Content")).not.toBeInTheDocument();
  });

  it("redirects User away from Admin-only portal", () => {
    storeToken(fakeJwt(validPayload({ Role: "User" })));
    renderWithProviders(
      <RequireRole roles={["Administrator"]}>
        <div>Admin Portal Content</div>
      </RequireRole>,
    );
    expect(screen.queryByText("Admin Portal Content")).not.toBeInTheDocument();
  });
});
