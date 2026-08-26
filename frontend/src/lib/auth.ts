/**
 * Client-side JWT helpers — Module 7 issue 1.
 *
 * Storage choice: `localStorage` (persists across page refresh). Trade-off
 * (persistence vs XSS exposure) is documented in Review.md §Module 7.
 * No refresh tokens exist yet (Module 2 scope), so an expired token simply
 * logs the user out.
 */

const TOKEN_KEY = "trace.access_token";

export interface JwtPayload {
  /** Standard subject — user id as a string */
  sub: string;
  /** DoD-required claim */
  UserID: number;
  /** `User` / `Officer` / `Administrator` at issue time */
  Role: string;
  iat: number;
  exp: number;
  [claim: string]: unknown;
}

export const TOKEN_KEY_NAME = TOKEN_KEY;

/** Decode the payload half of a JWT without verifying the signature.
 *  The signature is only validated server-side; here we merely read the
 *  claims for routing/display. Returns null for anything undecodable. */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      // eslint-disable-next-line no-control-regex
      atob(padded).replace(/([\u0080-\uffff])/g, (_, c: string) =>
        `%${c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`,
      ),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload): boolean {
  return payload.exp * 1000 <= Date.now();
}

const KNOWN_ROLES = ["User", "Officer", "Administrator"] as const;

/** Strict shape check — rejects tampered/foreign payloads (missing or
 *  malformed `exp`, non-numeric `UserID`, unknown `Role`). The signature is
 *  only verifiable server-side, but an obviously-tampered payload must not
 *  silently render privileged views (Module 7 DoD). */
export function isValidPayload(payload: JwtPayload | null): payload is JwtPayload {
  if (!payload) return false;
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return false;
  if (isExpired(payload)) return false;
  if (typeof payload.UserID !== "number" || !Number.isFinite(payload.UserID)) return false;
  if (typeof payload.Role !== "string") return false;
  if (!(KNOWN_ROLES as readonly string[]).includes(payload.Role)) return false;
  return true;
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthSession {
  token: string;
  payload: JwtPayload;
  role: string;
}

/** Read the current session. Returns null (and clears a stale token) when
 *  the stored token is missing, malformed, expired, or has a payload shape
 *  that cannot belong to a TRACE token. */
export function getAuthSession(): AuthSession | null {
  const token = getStoredToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!isValidPayload(payload)) {
    clearToken();
    return null;
  }
  return { token, payload, role: payload.Role };
}

/** Human label for the portal a role maps to. */
export function portalForRole(role: string | undefined): "user" | "officer" | "admin" | null {
  switch (role) {
    case "Administrator":
      return "admin";
    case "Officer":
      return "officer";
    case "User":
      return "user";
    default:
      return null;
  }
}
