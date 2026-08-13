import type { ReactNode } from "react";

interface Props {
  title?: string;
  /** small muted text on the right of the header */
  meta?: ReactNode;
  /** extra header actions (e.g. buttons) */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ title, meta, actions, children, className = "", noPadding = false }: Props) {
  return (
    <section className={`rounded-[12px] border border-line bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-4">
          <div className="flex items-baseline gap-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink">{title}</h3>
            {meta && <span className="text-[11px] text-muted">{meta}</span>}
          </div>
          {actions}
        </div>
      )}
      <div className={noPadding ? "" : "p-[18px]"}>{children}</div>
    </section>
  );
}
