/**
 * Button styling — TRACE Design System §07.
 *
 * Kept out of `Button.tsx` so that file exports only its component (react
 * fast-refresh rule), and so the same styling can be composed onto a
 * non-`<button>` element such as a router `Link`.
 *
 * Variants: primary (ink fill), outline (white + border), textLink (amber,
 * no container), plus `danger` and `ghost` as documented extensions of the
 * system. Every variant supports default / hover / disabled.
 *
 * Spec: height 44–48px, radius 10–12px, Inter semibold 14–15px.
 */
export type ButtonVariant = "primary" | "outline" | "textLink" | "danger" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-input text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "h-11 border border-ink bg-ink px-4 text-white hover:bg-black",
  outline: "h-11 border border-line bg-surface px-4 text-ink hover:bg-soft hover:border-muted",
  // No filled container; min-h keeps the click target at 44px.
  textLink: "min-h-11 border border-transparent bg-transparent px-1 text-amber hover:underline",
  danger: "h-11 border border-danger/40 bg-surface px-4 text-danger hover:bg-danger/5",
  ghost: "h-11 border border-transparent bg-transparent px-3 text-muted hover:bg-soft hover:text-ink",
};

/** Compose the button styling on any element (e.g. a router Link). */
export function buttonClass(variant: ButtonVariant = "outline", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}
