import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-[3px] focus:ring-brand/10";

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
}

export function Field({ label, children, error }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) {
  const { compact, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={`${compact ? "w-auto rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-brand" : inputClass} ${className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[90px] ${props.className ?? ""}`} />;
}
