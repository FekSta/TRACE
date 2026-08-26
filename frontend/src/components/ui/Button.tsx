import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white border border-brand hover:bg-brand-dark disabled:opacity-50",
  outline:
    "bg-white text-ink border border-line hover:bg-soft disabled:opacity-50",
  danger:
    "bg-white text-danger border border-danger/40 hover:bg-danger/5 disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-soft hover:text-ink disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export default function Button({ variant = "outline", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
