/**
 * SearchInput — the dashboard search control (page topbar / page header).
 *
 * Pill-shaped, token-only: surface fill, `line` border, leading `search`
 * glyph, muted placeholder, trailing clear button, and the shared §08 amber
 * focus treatment. The caller owns the value; this component never fetches.
 *
 * `ariaLabel` is required because each dashboard searches a different scope
 * ("Search claims…", "Search categories…") and that scope must be announced.
 */
interface Props {
  value: string;
  onChange: (value: string) => void;
  /** accessible name for the field — names the scope, not just "search" */
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  ariaLabel,
  placeholder = "Search…",
  className = "",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <span
        className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-muted"
        aria-hidden="true"
      >
        search
      </span>
      <input
        type="text"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-10 text-body text-ink outline-none transition placeholder:text-muted/70 focus:border-amber focus:ring-[3px] focus:ring-amber/15"
      />
      {value !== "" && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            close
          </span>
        </button>
      )}
    </div>
  );
}
