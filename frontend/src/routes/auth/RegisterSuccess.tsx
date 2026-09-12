import { Link } from "react-router-dom";
import { buttonClass } from "../../components/ui/buttonStyles";

/** Register success — design system §12 auth surfaces. */
export default function RegisterSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-lg overflow-hidden rounded-auth bg-surface shadow-card">
        <section className="flex flex-col items-center px-[60px] py-[70px] text-center">
          <img src="/images/success.svg" className="mb-8 w-[120px]" alt="Success" />
          <h1 className="mb-4 font-display text-h1 text-ink">Registration Successful</h1>
          <p className="mb-9 max-w-[420px] text-body-lg leading-relaxed text-muted">
            Your TRACE account has been created successfully. You can now sign in to report items and track claims.
          </p>
          <Link to="/login" className={buttonClass("primary")}>
            Continue to Login
          </Link>
        </section>
      </div>
    </div>
  );
}
