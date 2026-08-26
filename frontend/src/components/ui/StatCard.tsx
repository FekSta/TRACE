import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}

export default function StatCard({ label, value, meta }: Props) {
  return (
    <section className="rounded-[12px] border border-line bg-surface p-5 shadow-card">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      <div className="my-2 font-display text-[34px] font-bold leading-none text-ink">{value}</div>
      {meta && <span className="text-xs text-muted">{meta}</span>}
    </section>
  );
}
