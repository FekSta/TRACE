import type { ReactNode } from "react";

interface Props {
  message?: string;
  hint?: ReactNode;
}

export default function EmptyState({ message = "No matching records found.", hint }: Props) {
  return (
    <div className="px-5 py-12 text-center text-muted">
      <span className="material-symbols-outlined mb-2 text-4xl opacity-40">inbox</span>
      <p className="text-sm">{message}</p>
      {hint && <div className="mx-auto mt-2 max-w-md text-xs leading-relaxed opacity-80">{hint}</div>}
    </div>
  );
}
