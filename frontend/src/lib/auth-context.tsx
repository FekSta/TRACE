import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { clearToken, getAuthSession, type AuthSession } from "./auth";

interface AuthContextValue {
  session: AuthSession | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({ session: null, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
