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

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
