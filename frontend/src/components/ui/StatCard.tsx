import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}

/** StatCard — a card-surface metric tile on the §11 card treatment. */
export default function StatCard({ label, value, meta }: Props) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <span className="text-small font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      <div className="my-2 font-display text-h1 font-bold leading-none text-ink">{value}</div>
      {meta && <span className="text-small text-muted">{meta}</span>}
    </section>
  );
}
