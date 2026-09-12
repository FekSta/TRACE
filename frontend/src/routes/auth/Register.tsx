import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";

/**
 * Register — backed by the real POST /auth/register endpoint (Notes.md
 * §8.3). Self-registration always creates a User account (role assignment
 * is an Admin action). Auth layout per design system §12.
 */
export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setFormError("");

    let valid = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setEmailError("Please enter a valid email.");
      valid = false;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) {
      setPasswordError("Password must contain at least 8 characters and a number.");
      valid = false;
    } else if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match.");
      valid = false;
    }
    if (!form.terms) {
      setFormError("Please accept the Terms & Conditions.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/register/success");
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
        <section className="flex flex-col justify-between bg-surface p-8 md:p-[60px]">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-input bg-ink font-display text-h3 font-bold text-white">
                T
              </div>
              <h2 className="font-display text-h2 text-ink">TRACE</h2>
            </div>
            <p className="mb-8 mt-2 text-body text-muted">Every lost item leaves a trace.</p>

            <div className="mb-8">
              <h1 className="mb-2 font-display text-h1 text-ink">Create Account</h1>
              <p className="text-body-lg leading-relaxed text-muted">
                Join TRACE to report, track, and recover lost items.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First Name" htmlFor="firstName">
                  <TextInput
                    id="firstName"
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Last Name" htmlFor="lastName">
                  <TextInput
                    id="lastName"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label="Email Address" htmlFor="email" error={emailError}>
                <TextInput
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <TextInput
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
              </Field>

              <Field label="Confirm Password" htmlFor="confirmPassword" error={passwordError}>
                <TextInput
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  required
                />
              </Field>

              <label className="mt-1 flex items-start gap-2.5 text-body leading-relaxed text-muted">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => set("terms", e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I agree to the{" "}
                  <a href="#" className="font-semibold text-amber hover:underline">
                    Terms &amp; Conditions
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-semibold text-amber hover:underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              {formError && (
                <div className="rounded-input border border-danger/30 bg-danger/5 px-4 py-3 text-body text-danger">
                  {formError}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </div>

          <div className="mt-10 text-center text-body text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-amber hover:underline">
              Login
            </Link>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-auth-panel md:block">
          <img src="/images/login-side-image.jpeg" alt="TRACE Illustration" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-auth-panel/25 to-auth-panel/55 p-10">
            <div className="flex items-center gap-2.5 rounded-full bg-white/15 px-6 py-3 text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[22px]">location_on</span>
              <span className="font-medium">Every lost item leaves a trace.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
