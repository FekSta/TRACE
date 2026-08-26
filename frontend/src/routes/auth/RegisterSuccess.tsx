import { Link } from "react-router-dom";

/** Register success — translation of demo/auth/register-successful.html. */
export default function RegisterSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <section className="flex flex-col items-center px-[60px] py-[70px] text-center">
          <img src="/images/success.svg" className="mb-8 w-[120px]" alt="Success" />
          <h1 className="mb-4 font-display text-[2rem] font-bold text-auth-ink">Registration Successful</h1>
          <p className="mb-9 max-w-[420px] leading-relaxed text-muted">
            Your TRACE account has been created successfully. You can now sign in to report items and track claims.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-auth-ink px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            Continue to Login
          </Link>
        </section>
      </div>
    </div>
  );
}
