import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import { getAuthSession, portalForRole, type AuthSession } from "../../lib/auth";
import Button from "../../components/ui/Button";

/**
 * Login success — design system §12 auth surfaces. Also the Module 7 issue 1
 * DoD proof: the decoded Role claim from the stored token is read and
 * rendered here (and logged on the Login page).
 */
export default function LoginSuccess() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const s = getAuthSession();
    if (!s) {
      navigate("/login", { replace: true });
      return;
    }
    setSession(s);
    // Auto-redirect to the role portal after a short beat.
    const portal = portalForRole(s.payload.Role);
    if (portal) {
      const t = setTimeout(() => navigate(`/${portal}`, { replace: true }), 4000);
      const i = setInterval(() => setCountdown((c) => c + 1), 1000);
      return () => {
        clearTimeout(t);
        clearInterval(i);
      };
    }
  }, [navigate]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-canvas py-6 md:py-[50px]">
      <div className="mx-auto grid w-[min(1200px,95%)] min-h-[calc(100vh-100px)] overflow-hidden rounded-auth bg-surface shadow-card md:grid-cols-2">
        <section className="flex flex-col items-center justify-center p-[60px] text-center">
          <img src="/images/success.svg" className="mb-8 w-[120px]" alt="Success" />
          <h1 className="mb-4 font-display text-h1 text-ink">Login Successful</h1>
          <p className="mb-9 max-w-[420px] text-body-lg leading-relaxed text-muted">
            Welcome back! Your account has been authenticated successfully.
          </p>

          <div className="mb-9 w-full max-w-sm rounded-card border border-line bg-soft p-5 text-left">
            <p className="mb-3 text-small font-bold uppercase tracking-[0.12em] text-muted">
              Decoded JWT claims (issue 1 DoD)
            </p>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Role</dt>
                <dd className="font-display font-bold text-ink">{session.payload.Role}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">UserID</dt>
                <dd className="font-semibold">{session.payload.UserID}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Token expires</dt>
                <dd className="font-semibold">{new Date(session.payload.exp * 1000).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              const portal = portalForRole(session.payload.Role);
              navigate(portal ? `/${portal}` : "/login");
            }}
          >
            Go to Dashboard
            {portalForRole(session.payload.Role) ? ` (${session.payload.Role} portal)` : ""}
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign Out
          </Button>

          {portalForRole(session.payload.Role) && (
            <p className="mt-5 text-small text-muted">Auto-redirecting to your portal in {4 - countdown}s…</p>
          )}
          <p className="mt-2 text-body text-muted">
            Not your account?{" "}
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="font-semibold text-amber hover:underline"
            >
              Log out
            </button>
          </p>
        </section>

        <section className="relative hidden overflow-hidden bg-auth-panel md:block">
          <img src="/images/login-side-image.jpeg" alt="TRACE Illustration" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-auth-panel/25 to-auth-panel/55 p-10">
            <div className="flex items-center gap-2.5 rounded-full bg-white/15 px-6 py-3 text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[22px]">verified</span>
              <span className="font-medium">Secure session established.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
