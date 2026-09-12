import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export default function Modal({ open, title, onClose, children, footer, wide = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus on open only. Focus management must NOT depend on `onClose`: every
  // call site passes a freshly-created function (inline arrow or a function
  // declared in the page's render body), so a new identity on each parent
  // render — including every keystroke in a form — would re-run this effect
  // and `panelRef.current?.focus()` would steal focus from whichever input
  // the user is typing in. Escape handling keeps `onClose` in its own effect
  // so it always sees the latest callback without re-applying focus.
  useEffect(() => {
    if (!open) return;
    // Move focus into the dialog for keyboard users (basic a11y; a full
    // focus trap is future work).
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[88vh] overflow-y-auto rounded-card border border-line bg-surface shadow-hover outline-none`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-h3 text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-input text-muted hover:bg-soft hover:text-ink"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
