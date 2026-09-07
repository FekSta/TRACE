import { describe, it, expect, beforeEach } from "vitest";
import {
  decodeToken,
  isExpired,
  isValidPayload,
  portalForRole,
  storeToken,
  getStoredToken,
  clearToken,
  getAuthSession,
  type JwtPayload,
} from "./auth";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Build a fake JWT whose payload half encodes `obj`. */
function fakeJwt(obj: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.`;
}

/** A JWT payload that is valid and not expired. */
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

/* ------------------------------------------------------------------ */
/*  decodeToken                                                        */
/* ------------------------------------------------------------------ */

describe("decodeToken", () => {
  it("decodes a valid JWT payload", () => {
    const payload = validPayload({ UserID: 42, Role: "Officer" });
    const token = fakeJwt(payload);
    const result = decodeToken(token);
    expect(result).toEqual(payload);
  });

  it("returns null for an empty string", () => {
    expect(decodeToken("")).toBeNull();
  });

  it("returns null for a malformed token (no dots)", () => {
    expect(decodeToken("not-a-jwt")).toBeNull();
  });

  it("returns null for garbage base64", () => {
    expect(decodeToken("header.!!!.sig")).toBeNull();
  });

  it("returns null for a valid base64 payload that is not JSON", () => {
    const notJson = btoa("not-json").replace(/=/g, "");
    expect(decodeToken(`x.${notJson}.y`)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  isExpired                                                          */
/* ------------------------------------------------------------------ */

describe("isExpired", () => {
  it("returns true for a past exp", () => {
    expect(isExpired(validPayload({ exp: 1 }))).toBe(true);
  });

  it("returns false for a future exp", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isExpired(validPayload({ exp: future }))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  isValidPayload                                                     */
/* ------------------------------------------------------------------ */

describe("isValidPayload", () => {
  it("returns false for null", () => {
    expect(isValidPayload(null)).toBe(false);
  });

  it("returns false when exp is missing", () => {
    const p = validPayload() as Record<string, unknown>;
    delete (p as { exp?: unknown }).exp;
    expect(isValidPayload(p as JwtPayload)).toBe(false);
  });

  it("returns false when exp is not a number", () => {
    expect(isValidPayload(validPayload({ exp: "oops" as unknown as number }))).toBe(false);
  });

  it("returns false when expired", () => {
    expect(isValidPayload(validPayload({ exp: 1 }))).toBe(false);
  });

  it("returns false when UserID is not a number", () => {
    expect(isValidPayload(validPayload({ UserID: "oops" as unknown as number }))).toBe(false);
  });

  it("returns false when Role is unknown", () => {
    expect(isValidPayload(validPayload({ Role: "SuperAdmin" }))).toBe(false);
  });

  it("returns true for a valid payload", () => {
    expect(isValidPayload(validPayload())).toBe(true);
  });

  it("accepts Officer role", () => {
    expect(isValidPayload(validPayload({ Role: "Officer" }))).toBe(true);
  });

  it("accepts Administrator role", () => {
    expect(isValidPayload(validPayload({ Role: "Administrator" }))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  portalForRole                                                      */
/* ------------------------------------------------------------------ */

describe("portalForRole", () => {
  it("maps User → user", () => expect(portalForRole("User")).toBe("user"));
  it("maps Officer → officer", () => expect(portalForRole("Officer")).toBe("officer"));
  it("maps Administrator → admin", () => expect(portalForRole("Administrator")).toBe("admin"));
  it("returns null for unknown role", () => expect(portalForRole("Guest")).toBeNull());
  it("returns null for undefined", () => expect(portalForRole(undefined)).toBeNull());
});

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

describe("localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("storeToken / getStoredToken round-trips", () => {
    storeToken("abc.def.ghi");
    expect(getStoredToken()).toBe("abc.def.ghi");
  });

  it("getStoredToken returns null when empty", () => {
    expect(getStoredToken()).toBeNull();
  });

  it("clearToken removes the stored token", () => {
    storeToken("abc.def.ghi");
    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  getAuthSession                                                     */
/* ------------------------------------------------------------------ */

describe("getAuthSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getAuthSession()).toBeNull();
  });

  it("returns null and clears token when payload is invalid", () => {
    storeToken("invalid");
    expect(getAuthSession()).toBeNull();
    expect(getStoredToken()).toBeNull(); // stale token cleaned up
  });

  it("returns a session for a valid token", () => {
    const payload = validPayload({ UserID: 7, Role: "Officer" });
    storeToken(fakeJwt(payload));
    const session = getAuthSession();
    expect(session).not.toBeNull();
    expect(session!.role).toBe("Officer");
    expect(session!.payload.UserID).toBe(7);
  });

  it("returns null and clears token when expired", () => {
    const payload = validPayload({ exp: 1 });
    storeToken(fakeJwt(payload));
    expect(getAuthSession()).toBeNull();
    expect(getStoredToken()).toBeNull();
  });
});
