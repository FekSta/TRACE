import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Form controls — TRACE Design System §08.
 *
 * All three controls share height, border, radius, typography and the amber
 * focus treatment (`rgba(217, 119, 6, 0.15)`) so they read as one system.
 */
export const inputClass =
  "w-full rounded-input border border-line bg-surface px-3 text-body text-ink outline-none transition placeholder:text-muted/70 focus:border-amber focus:ring-[3px] focus:ring-amber/15";

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  /** id of the control this label belongs to (Accessibility Baseline 4) */
  htmlFor?: string;
}

export function Field({ label, children, error, htmlFor }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-body font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} h-11 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) {
  const { compact, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={`${
        compact
          ? "w-auto rounded-input border border-line bg-surface px-3 py-2 text-small text-ink outline-none focus:border-amber focus:ring-[3px] focus:ring-amber/15"
          : `${inputClass} h-11`
      } ${className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[90px] py-2.5 ${props.className ?? ""}`} />;
}
