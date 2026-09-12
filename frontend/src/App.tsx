import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ToastProvider } from "./components/ui/Toast";
import { RequireRole } from "./routes/guards";
import { portalForRole } from "./lib/auth";
import Login from "./routes/auth/Login";
import Register from "./routes/auth/Register";
import RegisterSuccess from "./routes/auth/RegisterSuccess";
import LoginSuccess from "./routes/auth/LoginSuccess";
import UserPortal from "./routes/user/UserPortal";
import OfficerPortal from "./routes/officer/OfficerPortal";
import AdminPortal from "./routes/admin/AdminPortal";

/**
 * Dev-only design system reference (/design). `import.meta.env.DEV` is
 * statically replaced with `false` in a production build, so the dynamic
 * import — and the chunk it points at — is eliminated from the bundle: the
 * route does not exist in production. It is linked from nowhere (direct URL
 * only) and needs no session.
 */
const DesignSystem = import.meta.env.DEV
  ? lazy(() => import("./routes/design/DesignSystem"))
  : null;

/** "/" and unknown paths resolve to the session's own portal (or /login). */
function RootRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  const portal = portalForRole(session.role);
  return <Navigate to={portal ? `/${portal}` : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth flow — register → register-success → login → login-success */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/success" element={<RegisterSuccess />} />
            <Route path="/login/success" element={<LoginSuccess />} />

            {/* Portals — gated by decoded JWT role */}
            <Route
              path="/user"
              element={
                <RequireRole roles={["User"]}>
                  <UserPortal />
                </RequireRole>
              }
            />
            <Route
              path="/officer"
              element={
                <RequireRole roles={["Officer", "Administrator"]}>
                  <OfficerPortal />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole roles={["Administrator"]}>
                  <AdminPortal />
                </RequireRole>
              }
            />

            {/* Dev-only design system reference — absent from production */}
            {DesignSystem && (
              <Route
                path="/design"
                element={
                  <Suspense fallback={null}>
                    <DesignSystem />
                  </Suspense>
                }
              />
            )}

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
