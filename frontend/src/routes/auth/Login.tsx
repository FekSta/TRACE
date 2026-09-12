import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { decodeToken } from "../../lib/auth";
import { useAuth } from "../../lib/auth-context";
import Button from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";

/**
 * Login — backed by the real POST /auth/login endpoint (Notes.md §8.3).
 * Visual system: TRACE Design System §12 (split auth layout: white form
 * panel + `auth-panel` visual side, 20px panel radius, frosted badge).
 */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setFormError("");

    let valid = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email.");
      valid = false;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      const data = await api.post<{ access_token: string; token_type: string }>(
        "/auth/login",
        { email: email.trim(), password },
      );
      // Store the token AND establish the session in AuthContext. Portal
      // guards (RequireRole) read the context session, so without the second
      // step a successful login would bounce straight back to /login.
      login(data.access_token);
      // DoD: prove the Role claim is readable from the stored token.
      const payload = decodeToken(data.access_token);
      console.debug(
        "[TRACE auth] token stored; decoded claims:",
        { role: payload?.Role, userID: payload?.UserID, exp: payload?.exp },
      );
      navigate("/login/success");
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError("Could not reach the server. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas py-6 md:py-[50px]">
      <div className="mx-auto grid w-[min(1200px,95%)] min-h-[calc(100vh-100px)] overflow-hidden rounded-auth bg-surface shadow-card md:grid-cols-2">
        {/* Left — form */}
        <section className="flex flex-col justify-between bg-surface p-8 md:p-[60px]">
          <div className="fade-in-up">
            <div className="flex items-center gap-3">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-input bg-ink font-display text-h3 font-bold text-white">
                T
              </div>
              <h2 className="font-display text-h2 text-ink">TRACE</h2>
            </div>
            <p className="mb-8 mt-2 text-body text-muted">Every lost item leaves a trace.</p>

            <div className="mb-8">
              <h1 className="mb-2 font-display text-h1 text-ink">Welcome Back</h1>
              <p className="text-body-lg leading-relaxed text-muted">
                Sign in to manage your lost item reports and recovery claims.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <Field label="Email Address" htmlFor="email" error={emailError}>
                <TextInput
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-small font-semibold text-ink" htmlFor="password">
                    Password
                  </label>
                  <Button variant="textLink" type="button">
                    Forgot Password?
                  </Button>
                </div>
                <div className="relative">
                  <TextInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-14"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {passwordError && <p className="mt-1 text-small text-danger">{passwordError}</p>}
              </div>

              {formError && (
                <div className="rounded-input border border-danger/30 bg-danger/5 px-4 py-3 text-body text-danger">
                  {formError}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </div>

          <div className="mt-10 text-center text-body text-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-amber hover:underline">
              Create one
            </Link>
          </div>
        </section>

        {/* Right — visual panel */}
        <section className="relative hidden overflow-hidden bg-auth-panel md:block">
          <img
            src="/images/login-side-image.jpeg"
            alt="TRACE Login Illustration"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-auth-panel/25 to-auth-panel/55 p-10">
            <div className="flex items-center gap-2.5 rounded-full bg-white/15 px-6 py-3 text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[22px]">stars</span>
              <span className="font-medium">Recovery starts here.</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-between px-[50px] py-6 text-body text-muted">
        <p>© 2026 TRACE. All rights reserved.</p>
        <nav className="flex gap-5">
          <a href="#" className="text-inherit hover:text-ink">
            Privacy
          </a>
          <a href="#" className="text-inherit hover:text-ink">
            Terms
          </a>
          <a href="#" className="text-inherit hover:text-ink">
            Support
          </a>
        </nav>
      </footer>
    </div>
  );
}
