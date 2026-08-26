import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import type { LostItem, FoundItem, Claim } from "../../lib/types";

interface Props {
  onReport: () => void;
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
export default function UserDashboard({ onReport }: Props) {
  const { show } = useToast();
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
  ]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-bold leading-tight text-ink">My Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted">Track your reports, matches, and claims.</p>
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
        meta={`${activity.length} recent records`}
        actions={
          <Button variant="outline" onClick={() => onReport()}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Report
          </Button>
        }
      >
        {activity.length === 0 ? (
          <EmptyState
            message="No reports yet."
            hint={
              <button onClick={onReport} className="font-semibold text-brand hover:underline">
                Report your first lost or found item →
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {activity.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="transition-colors hover:bg-[#fafdfb]">
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
      </Card>
    </div>
  );
}
