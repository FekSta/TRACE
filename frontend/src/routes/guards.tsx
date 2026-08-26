import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";
import { portalForRole } from "../lib/auth";

/**
 * Route guards — portal selection is driven ENTIRELY by the decoded JWT
 * role claim (never a hardcoded flag). No valid session → /login. Wrong
 * role for the URL → bounced to that role's own portal.
 */
export function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!roles.includes(session.role)) {
    const portal = portalForRole(session.role);
    return <Navigate to={portal ? `/${portal}` : "/login"} replace />;
  }
  return <>{children}</>;
}
