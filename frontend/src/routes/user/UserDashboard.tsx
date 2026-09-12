import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import TableFooter from "../../components/ui/TableFooter";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { LostItem, FoundItem, Claim } from "../../lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "Lost", label: "Lost" },
  { id: "Found", label: "Found" },
];

interface Props {
  onReport: () => void;
  /** topbar search value — narrows only this student's fetched rows */
  query?: string;
}

interface ActivityRow {
  id: number;
  title: string;
  type: "Lost" | "Found";
  status: string;
  date: string | null;
}

/** User dashboard — stat cards + recent activity, mirroring
 *  demo/user/index.html layout, fed by the real scoped list endpoints. */
export default function UserDashboard({ onReport, query = "" }: Props) {
  const { show } = useToast();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setPage(1);
  }, [query, tab]);
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");

  if (lost.loading || found.loading || claims.loading) return <Loading label="Loading your dashboard…" />;
  if (lost.error && found.error) {
    return (
      <Card title="Dashboard unavailable">
        <EmptyState message={lost.error} hint="Check that the backend is running and you are signed in." />
      </Card>
    );
  }

  const lostItems = lost.data ?? [];
  const foundItems = found.data ?? [];
  const myClaims = claims.data ?? [];

  const activeLost = lostItems.filter((i) => i.status === "Reported" || i.status === "Matched");
  const pendingClaims = myClaims.filter((c) => c.verification_status === "Pending");

  const activity: ActivityRow[] = [
    ...lostItems.map((i) => ({ id: i.id, title: i.title, type: "Lost" as const, status: i.status, date: i.date_lost })),
    ...foundItems.map((i) => ({ id: i.id, title: i.title, type: "Found" as const, status: i.status, date: i.date_found })),
  ].sort((a, b) => b.id - a.id);

  const counts = countByTab(activity, (row) => row.type);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? activity.length : counts[t.id] ?? 0,
  }));
  const tabbed = tab === "all" ? activity : activity.filter((row) => row.type === tab);
  const rows = filterRows(tabbed, query, (row) => [row.id, row.title, row.status, row.type, row.date]);
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-ink">My Dashboard</h1>
          <p className="mt-1.5 text-body text-muted">Track your reports, matches, and claims.</p>
        </div>
        <Button variant="primary" onClick={onReport}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Report Lost Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Active Reports" value={activeLost.length + foundItems.filter((i) => i.status === "Available").length} meta="awaiting match or claim" />
        <StatCard label="Pending Claims" value={pendingClaims.length} meta={pendingClaims.length ? "under review by an officer" : "no claims in review"} />
        <StatCard label="Total Reports" value={lostItems.length + foundItems.length} meta="lost + found" />
      </div>

      <Card
        title="Recent Activity"
        meta={`${activity.length} record${activity.length === 1 ? "" : "s"}`}
        actions={<FilterTabs tabs={tabs} value={tab} onChange={setTab} variant="card" ariaLabel="Filter activity by type" />}
        noPadding
      >
        {rows.length === 0 ? (
          <EmptyState
            message={
              query.trim()
                ? `No reports match “${query.trim()}”.`
                : activity.length === 0
                  ? "No reports yet."
                  : "No reports in this view."
            }
            hint={
              query.trim() || activity.length > 0 ? (
                "Clear the search or switch back to All."
              ) : (
                <button onClick={onReport} className="font-semibold text-amber hover:underline">
                  Report your first lost or found item →
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-small">
                {visibleRows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="transition-colors hover:bg-soft">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink">{row.title}</span>
                      <span className="ml-2 text-muted">#{row.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.type} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{row.date ?? "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button variant="ghost" onClick={() => show(`Report #${row.id} details would open here`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TableFooter page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
