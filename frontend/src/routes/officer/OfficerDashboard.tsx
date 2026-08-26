import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import type { LostItem, FoundItem, Claim } from "../../lib/types";

interface QueueRow {
  id: number;
  title: string;
  kind: "lost" | "found";
  status: string;
  categoryId: number;
}

/** Officer dashboard — mirrors demo/officer renderDashboard(), fed by the
 *  unscoped list endpoints (Officer sees all items/claims). */
export default function OfficerDashboard() {
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");

  if (lost.loading || found.loading || claims.loading) return <Loading label="Loading dashboard…" />;

  const lostItems = lost.data ?? [];
  const foundItems = found.data ?? [];
  const allClaims = claims.data ?? [];

  const pendingVerifications =
    lostItems.filter((i) => i.status === "Reported").length +
    foundItems.filter((i) => i.status === "Available").length;
  const claimsToReview = allClaims.filter((c) => c.verification_status === "Pending").length;

  const queue: QueueRow[] = [
    ...lostItems
      .filter((i) => i.status === "Reported")
      .map((i) => ({ id: i.id, title: i.title, kind: "lost" as const, status: i.status, categoryId: i.category_id })),
    ...foundItems
      .filter((i) => i.status === "Available")
      .map((i) => ({ id: i.id, title: i.title, kind: "found" as const, status: i.status, categoryId: i.category_id })),
  ].slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Officer Dashboard</h1>
        <p className="mt-1.5 text-sm text-muted">Monitor verification, claims, and recovery activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-[12px] border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em]">Verification Queue</h3>
            <span className="text-[11px] text-muted">{pendingVerifications} pending</span>
          </div>
          {queue.length === 0 ? (
            <EmptyState message="The verification queue is empty." />
          ) : (
            <div className="space-y-2">
              {queue.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="flex items-center gap-3.5 rounded-lg border border-line p-3">
                  <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-lg bg-soft text-muted">
                    <span className="material-symbols-outlined">inventory_2</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-ink">
                      {row.title} <StatusBadge status={row.kind === "lost" ? "Lost" : "Found"} />
                    </strong>
                    <p className="mt-0.5 text-xs text-muted">
                      Report #{row.id} · category #{row.categoryId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <StatCard label="Pending Verifications" value={pendingVerifications} meta="reported items awaiting review" />
          <StatCard label="Claims To Review" value={claimsToReview} meta={claimsToReview ? "approve or reject" : "all clear"} />
        </div>
      </div>

      <Card title="Active Claims" meta={`${allClaims.length} total`}>
        {allClaims.length === 0 ? (
          <EmptyState message="No claims yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Item pairing</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Claim date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {allClaims.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">#{c.id}</td>
                    <td className="px-4 py-3.5">
                      Lost #<strong>{c.lost_item_id}</strong> ↔ Found #<strong>{c.found_item_id}</strong>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.verification_status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(c.claim_date).toLocaleDateString()}
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
