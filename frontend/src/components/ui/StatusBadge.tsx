/**
 * StatusBadge — TRACE Design System §09.
 *
 * Five semantic treatments, each a soft surface + legible text + dot:
 *   neutral → Reported / inactive / archived
 *   amber   → Matched / pending attention
 *   blue    → Claimed / claim submitted
 *   success → Returned / Approved / complete
 *   danger  → Rejected / cancelled
 *
 * Colour is never the only cue — the status text is always rendered
 * (Accessibility Baseline 3 and 8).
 */
type Treatment = "neutral" | "amber" | "info" | "success" | "danger";

const TREATMENTS: Record<Treatment, { pill: string; dot: string }> = {
  neutral: { pill: "bg-soft text-muted", dot: "bg-muted" },
  amber: { pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  info: { pill: "bg-info-soft text-info", dot: "bg-info" },
  success: { pill: "bg-success/10 text-success-ink", dot: "bg-success" },
  danger: { pill: "bg-danger/10 text-danger", dot: "bg-danger" },
};

const PALETTE: Record<string, Treatment> = {
  // neutral — reported / not yet acted on, or terminally inactive
  Reported: "neutral",
  Suspended: "neutral",
  Inactive: "neutral",
  Archived: "neutral",
  // amber — attention required / potential match
  Matched: "amber",
  Lost: "amber",
  Pending: "amber",
  Suggested: "amber",
  // blue — claim submitted / verification in progress
  Claimed: "info",
  Verifying: "info",
  // success — approved, returned, or otherwise complete
  Found: "success",
  Available: "success",
  Returned: "success",
  Approved: "success",
  Accepted: "success",
  Completed: "success",
  Closed: "success",
  Active: "success",
  // danger — rejected or cancelled
  Rejected: "danger",
  Cancelled: "danger",
};

export default function StatusBadge({ status }: { status: string }) {
  const treatment = TREATMENTS[PALETTE[status] ?? "neutral"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-small font-semibold ${treatment.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${treatment.dot}`} />
      {status}
    </span>
  );
}
