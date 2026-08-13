import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { storeToken, decodeToken } from "../../lib/auth";

/**
 * Login — direct translation of demo/auth/login.html, backed by the real
 * POST /auth/login endpoint (Notes.md §8.3). On success the token is stored
 * and the decoded Role claim is logged (Module 7 issue 1 DoD artifact).
 */
export default function Login() {
  const navigate = useNavigate();
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
      storeToken(data.access_token);
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

  const inputClass =
    "w-full rounded-[10px] border border-gray-300 bg-white px-4 py-3.5 text-[15px] text-auth-ink outline-none transition focus:border-auth-amber focus:ring-[3px] focus:ring-auth-amber/15";

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-[50px]">
      <div className="mx-auto grid w-[min(1200px,95%)] min-h-[calc(100vh-100px)] overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:grid-cols-2">
        {/* Left — form */}
        <section className="flex flex-col justify-between bg-white p-8 md:p-[60px]">
          <div className="fade-in-up">
            <div className="flex items-center gap-3">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-lg bg-brand font-display text-lg font-extrabold text-white">
                T
              </div>
              <h2 className="font-display text-[1.7rem] font-extrabold text-auth-ink">TRACE</h2>
            </div>
            <p className="mb-8 mt-2 text-sm text-muted">Every lost item leaves a trace.</p>

            <div className="mb-8">
              <h1 className="mb-2 font-display text-[2rem] font-bold text-auth-ink">Welcome Back</h1>
              <p className="leading-relaxed text-muted">
                Sign in to manage your lost item reports and recovery claims.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div>
                <label className="mb-2 block text-[0.95rem] font-semibold text-gray-700" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailError && <small className="mt-1.5 block text-[0.85rem] text-danger">{emailError}</small>}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[0.95rem] font-semibold text-gray-700" htmlFor="password">
                    Password
                  </label>
                  <Link to="#" className="text-[0.9rem] text-auth-amber hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`${inputClass} pr-14`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-auth-ink"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {passwordError && (
                  <small className="mt-1.5 block text-[0.85rem] text-danger">{passwordError}</small>
                )}
              </div>

              {formError && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[0.9rem] text-danger">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-auth-ink px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </form>
          </div>

          <div className="mt-10 text-center text-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-auth-amber hover:underline">
              Create one
            </Link>
          </div>
        </section>

        {/* Right — image side */}
        <section className="relative hidden overflow-hidden bg-auth-navy md:block">
          <img
            src="/images/login-side-image.jpeg"
            alt="TRACE Login Illustration"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-auth-navy/25 to-auth-navy/55 p-10">
            <div className="flex items-center gap-2.5 rounded-full bg-white/15 px-6 py-3 text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[22px]">stars</span>
              <span className="font-medium">Recovery starts here.</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-between px-[50px] py-6 text-[0.9rem] text-muted">
        <p>© 2026 TRACE. All rights reserved.</p>
        <nav className="flex gap-5">
          <a href="#" className="text-inherit hover:text-auth-ink">Privacy</a>
          <a href="#" className="text-inherit hover:text-auth-ink">Terms</a>
          <a href="#" className="text-inherit hover:text-auth-ink">Support</a>
        </nav>
      </footer>
    </div>
  );
}
