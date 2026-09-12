import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  /** optional Material Symbols glyph shown in a soft tile (sheet §11 cards) */
  icon?: string;
}

/** StatCard — a card-surface metric tile on the §11 card treatment. */
export default function StatCard({ label, value, meta, icon }: Props) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="text-small font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-soft text-muted">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {icon}
            </span>
          </span>
        )}
      </div>
      <div className="my-2 font-display text-h1 font-bold leading-none text-ink">{value}</div>
      {meta && <span className="text-small text-muted">{meta}</span>}
    </section>
  );
}
