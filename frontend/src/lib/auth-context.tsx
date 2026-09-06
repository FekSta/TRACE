import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { clearToken, getAuthSession, storeToken, type AuthSession } from "./auth";

interface AuthContextValue {
  session: AuthSession | null;
  /** Establish a session from a freshly-issued token (post-login). */
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({ session: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());

  const login = useCallback((token: string) => {
    storeToken(token);
    // Re-read through getAuthSession so the session only exists when the
    // token actually shape-checks (valid exp/UserID, known Role) — a
    // tampered token must not establish a session. Portal guards read this
    // context, so without this update a fresh login would bounce to /login.
    setSession(getAuthSession());
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
