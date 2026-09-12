/**
 * StatusIndicator — TRACE Design System §10.
 *
 * A small indicator plus a text label. Four states:
 *   Pending   ○  waiting for action
 *   Approved  ✓  approved / complete
 *   Verifying ●  verification in progress
 *   Rejected  ⊘  rejected / unsuccessful
 *
 * The label is required by design — the indicator colour is a supporting
 * cue only (Accessibility Baseline 3 and 8).
 */
type Status = "Pending" | "Approved" | "Verifying" | "Rejected";

const STATES: Record<Status, { icon: string; iconClass: string; label: string }> = {
  Pending: { icon: "circle", iconClass: "text-muted", label: "Pending" },
  Approved: { icon: "check_circle", iconClass: "text-success-ink", label: "Approved" },
  Verifying: { icon: "fiber_manual_record", iconClass: "text-info", label: "Verifying" },
  Rejected: { icon: "block", iconClass: "text-danger", label: "Rejected" },
};

interface Props {
  status: Status;
  /** override the default label text (the default is the status name) */
  label?: string;
}

export default function StatusIndicator({ status, label }: Props) {
  const state = STATES[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-body text-ink">
      <span className={`material-symbols-outlined text-[18px] ${state.iconClass}`} aria-hidden="true">
        {state.icon}
      </span>
      {label ?? state.label}
    </span>
  );
}
