import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import TableFooter from "../../components/ui/TableFooter";
import FilterTabs from "../../components/ui/FilterTabs";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { LostItem, FoundItem, Claim, Match, Category } from "../../lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function tabOf(claim: Claim): string {
  if (claim.verification_status === "Approved") return "approved";
  if (claim.verification_status === "Rejected") return "rejected";
  return "awaiting";
}

/**
 * Admin dashboard summary.
 *
 * The Module 7 issue list asks for `GET /dashboard/summary` and
 * `GET /dashboard/reports` (Dashboard module), but the milestone guardrail
 * prohibits new backend endpoints this pass. The summary is therefore
 * computed client-side from the existing list endpoints; the dedicated
 * Dashboard module endpoints remain the Module 8 handoff (Review.md §7).
 */
export default function AdminDashboard({ query = "" }: { query?: string }) {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const [viewed, setViewed] = useState<Claim | null>(null);
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");
  const matches = useAuthedFetch<Match[]>("/matches");
  const categories = useAuthedFetch<Category[]>("/categories");

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  if (lost.loading || found.loading || claims.loading) return <Loading label="Loading summary…" />;

  const lostItems = lost.data ?? [];
  const foundItems = found.data ?? [];
  const allClaims = claims.data ?? [];
  const allMatches = matches.data ?? [];
  const cats = categories.data ?? [];

  const openClaims = allClaims.filter((c) => c.status === "Active").length;
  const pendingVerification = allClaims.filter((c) => c.verification_status === "Pending").length;
  const suggestedMatches = allMatches.filter((m) => m.status === "Suggested").length;
  const recovered = foundItems.filter((f) => f.status === "Returned").length;
  const pageSize = 5;

  const counts = countByTab(allClaims, tabOf);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? allClaims.length : counts[t.id] ?? 0,
  }));
  const tabbed = tab === "all" ? allClaims : allClaims.filter((c) => tabOf(c) === tab);
  const rows = filterRows(tabbed, query, (c) => [
    c.id,
    c.lost_item_id,
    c.found_item_id,
    c.user_id,
    c.verification_status,
    c.status,
  ]);
  const visibleClaims = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h1 text-ink">Admin Dashboard</h1>
        <p className="mt-1.5 text-body text-muted">
          Platform summary — computed live from the existing API endpoints.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Lost Items" value={lostItems.length} meta="total reported items" icon="inventory_2" />
        <StatCard label="Found Items" value={foundItems.length} meta={`${recovered} returned to owners`} icon="search" />
        <StatCard
          label="Open Claims"
          value={openClaims}
          meta={`${pendingVerification} awaiting verification`}
          icon="description"
        />
        <StatCard label="Suggested Matches" value={suggestedMatches} meta="potential matches" icon="auto_awesome" />
        <StatCard label="Categories" value={cats.length} meta="active categories" icon="sell" />
      </div>

      <Card
        title="Claims overview"
        meta={`${allClaims.length} claim(s)`}
        actions={<FilterTabs tabs={tabs} value={tab} onChange={setTab} variant="card" ariaLabel="Filter claims" />}
        noPadding
      >
        {rows.length === 0 ? (
          <EmptyState
            message={query.trim() ? `No claims match “${query.trim()}”.` : "No claims in this view."}
            hint={query.trim() ? "Clear the search or switch back to All." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Claimant</th>
                  <th className="px-4 py-3">Pairing</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-small">
                {visibleClaims.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-soft">
                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {c.lost_item_title ?? c.found_item_title ?? "Claim"}
                    </td>
                    <td className="px-4 py-3.5">{c.claimant_name ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      {c.lost_item_title ?? "Lost item"}
                      <span className="mx-1 text-muted">↔</span>
                      {c.found_item_title ?? "Found item"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.verification_status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{new Date(c.claim_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button variant="outline" onClick={() => setViewed(c)}>
                        View
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          arrow_forward
                        </span>
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

      <Modal
        open={viewed !== null}
        title="Claim details"
        onClose={() => setViewed(null)}
        footer={<Button onClick={() => setViewed(null)}>Close</Button>}
      >
        {viewed && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ["Claimant", viewed.claimant_name ?? "—"],
              ["Lost item", viewed.lost_item_title ?? "—"],
              ["Found item", viewed.found_item_title ?? "—"],
              ["Verification", viewed.verification_status],
              ["Status", viewed.status],
              ["Claim date", new Date(viewed.claim_date).toLocaleString()],
              ["Reviewing officer", viewed.officer_name ?? "Not yet assigned"],
              ["Collected", viewed.collection_date ? new Date(viewed.collection_date).toLocaleString() : "Not collected"],
            ].map(([term, detail]) => (
              <div key={term}>
                <dt className="text-small font-semibold uppercase tracking-[0.06em] text-muted">{term}</dt>
                <dd className="mt-1 text-body text-ink">{detail}</dd>
              </div>
            ))}
            {viewed.verification_notes && (
              <div className="sm:col-span-2">
                <dt className="text-small font-semibold uppercase tracking-[0.06em] text-muted">Notes</dt>
                <dd className="mt-1 text-body text-ink">{viewed.verification_notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}
