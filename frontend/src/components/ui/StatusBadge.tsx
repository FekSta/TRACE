/** Status pill — maps backend enum values onto the officer badge palette
 *  (demo/officer/style.css: badge-found/approved = green, badge-lost =
 *  amber, badge-pending = slate, badge-rejected = red). */
const PALETTE: Record<string, string> = {
  // green — active/positive
  Found: "bg-brand-light text-brand",
  Available: "bg-brand-light text-brand",
  Claimed: "bg-brand-light text-brand",
  Approved: "bg-brand-light text-brand",
  Accepted: "bg-brand-light text-brand",
  Matched: "bg-brand-light text-brand",
  Returned: "bg-brand-light text-brand",
  Completed: "bg-brand-light text-brand",
  Closed: "bg-brand-light text-brand",
  Active: "bg-brand-light text-brand",
  // amber — attention
  Lost: "bg-[#fff4e6] text-warning",
  Reported: "bg-[#fff4e6] text-warning",
  Suggested: "bg-[#fff4e6] text-warning",
  Pending: "bg-[#fff4e6] text-warning",
  // red — terminal negative
  Rejected: "bg-[#fdecec] text-danger",
  Cancelled: "bg-[#fdecec] text-danger",
  // neutral fallback
  Suspended: "bg-soft text-muted",
  Inactive: "bg-soft text-muted",
  Archived: "bg-soft text-muted",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = PALETTE[status] ?? "bg-soft text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cls.includes("text-brand") ? "bg-brand" : cls.includes("text-danger") ? "bg-danger" : cls.includes("text-warning") ? "bg-warning" : "bg-muted"}`} />
      {status}
    </span>
  );
}
