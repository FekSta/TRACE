import { useRef, type KeyboardEvent } from "react";

/** One filter tab. `id` is the value passed back to `onChange`. */
export interface FilterTab {
  id: string;
  label: string;
  /** optional count rendered after the label (e.g. "4" for "Awaiting Review") */
  count?: number;
}

interface Props {
  tabs: FilterTab[];
  /** currently selected tab id */
  value: string;
  onChange: (id: string) => void;
  /**
   * `page`  — a standalone pill row under the page title
   * `card`  — the single header control inside a card (TableDesign.md §3.1)
   */
  variant?: "page" | "card";
  ariaLabel?: string;
  className?: string;
}

/**
 * FilterTabs — the shared dashboard tab row (all three portals).
 *
 * Active tab is the ink pill with white text; inactive tabs are quiet
 * surface pills. Always a pill (`rounded-full`) per the design system's
 * shape language. Status is never colour-only: the label is always shown.
 *
 * Keyboard: ArrowLeft / ArrowRight move between tabs (roving `tabIndex`),
 * matching the `tablist` pattern. The row scrolls horizontally on narrow
 * viewports instead of overflowing the page.
 */
export default function FilterTabs({
  tabs,
  value,
  onChange,
  variant = "page",
  ariaLabel = "Filter",
  className = "",
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-2 overflow-x-auto ${
        variant === "card" ? "" : "pb-0.5"
      } ${className}`}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-body font-semibold transition-colors duration-150 ${
              active
                ? "bg-ink text-white"
                : "border border-line bg-surface text-muted hover:bg-soft hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-small ${active ? "text-white/70" : "text-muted"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
