import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import StatusIndicator from "../../components/ui/StatusIndicator";
import Button from "../../components/ui/Button";
import FilterTabs from "../../components/ui/FilterTabs";
import TableFooter from "../../components/ui/TableFooter";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { LostItem, FoundItem, Claim, Match } from "../../lib/types";

interface Props {
  /** topbar search value — filters only the rows this screen fetched */
  query: string;
  onNavigate: (page: string) => void;
}

interface QueueRow {
  id: number;
  title: string;
  kind: "lost" | "found";
  status: string;
  location: string | null;
  reporter: number;
}

/** Matches >= this score are surfaced as "high match score" (same threshold
 *  the student match list highlights). */
const HIGH_MATCH_SCORE = 60;

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

function indicatorFor(status: Claim["verification_status"]): "Pending" | "Approved" | "Rejected" {
  if (status === "Approved") return "Approved";
  if (status === "Rejected") return "Rejected";
  return "Pending";
}

/** Officer dashboard — mirrors `design/Officer/Officer-Dashboard.jpeg`:
 *  a verification queue with Verify/Reject actions, two summary cards, and an
 *  Active Claims table with card-level filter tabs and a table footer.
 *
 *  Fed by the existing unscoped list endpoints. The UI degrades honestly where
 *  the API has no data: there is no reporter name (shown as `User #id`), no
 *  item thumbnail, and no timestamp, so the mockup's relative-time and
 *  sparkline affordances are omitted rather than faked (Review.md). */
export default function OfficerDashboard({ query = "", onNavigate }: Props) {
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");
  const matches = useAuthedFetch<Match[]>("/matches");

  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  if (lost.loading || found.loading || claims.loading) return <Loading label="Loading dashboard…" />;

  const lostItems = lost.data ?? [];
  const foundItems = found.data ?? [];
  const allClaims = claims.data ?? [];
  const allMatches = matches.data ?? [];

  const scoreByPair = new Map(
    allMatches.map((m) => [`${m.lost_item_id}:${m.found_item_id}`, Math.round(Number(m.match_score))]),
  );
  const lostTitle = new Map(lostItems.map((i) => [i.id, i.title]));
  const foundTitle = new Map(foundItems.map((i) => [i.id, i.title]));

  const queue: QueueRow[] = [
    ...lostItems
      .filter((i) => i.status === "Reported")
      .map((i) => ({
        id: i.id,
        title: i.title,
        kind: "lost" as const,
        status: i.status,
        location: i.location_lost,
        reporter: i.user_id,
      })),
    ...foundItems
      .filter((i) => i.status === "Available")
      .map((i) => ({
        id: i.id,
        title: i.title,
        kind: "found" as const,
        status: i.status,
        location: i.storage_location,
        reporter: i.user_id,
      })),
  ].slice(0, 5);

  const pendingVerifications = queue.length;
  const highScoreClaims = allClaims.filter(
    (c) => (scoreByPair.get(`${c.lost_item_id}:${c.found_item_id}`) ?? 0) >= HIGH_MATCH_SCORE,
  ).length;

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
    lostTitle.get(c.lost_item_id),
    foundTitle.get(c.found_item_id),
  ]);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h1 text-ink">Officer Dashboard</h1>
        <p className="mt-1.5 text-body text-muted">Monitor verification, claims, and recovery activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-card border border-line bg-surface shadow-card lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h3 className="text-small font-semibold uppercase tracking-[0.06em] text-ink">Verification Queue</h3>
            <span className="text-small text-muted">{pendingVerifications} Pending</span>
          </div>
          {queue.length === 0 ? (
            <EmptyState message="The verification queue is empty." />
          ) : (
            <div className="divide-y divide-line">
              {queue.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
                  <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-input bg-soft text-muted">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      inventory_2
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-body text-ink">{row.title}</strong>
                      <StatusBadge status={row.kind === "lost" ? "Lost" : "Found"} />
                    </div>
                    <p className="mt-0.5 text-small text-muted">Reported by User #{row.reporter}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-small text-muted">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        location_on
                      </span>
                      {row.location ?? "Location not recorded"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="primary" onClick={() => onNavigate("verify")}>
                      Verify
                    </Button>
                    <Button variant="outline" onClick={() => onNavigate("verify")}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <StatCard
            label="Pending Verifications"
            value={pendingVerifications}
            meta="reported items awaiting review"
          />
          <StatCard
            label="Claims To Review"
            value={allClaims.filter((c) => c.verification_status === "Pending").length}
            meta={
              highScoreClaims
                ? `${highScoreClaims} high match score`
                : "no high-confidence matches waiting"
            }
          />
        </div>
      </div>

      <Card
        title="Active Claims"
        meta={`${allClaims.length} total`}
        actions={<FilterTabs tabs={tabs} value={tab} onChange={setTab} variant="card" ariaLabel="Filter active claims" />}
        noPadding
      >
        {rows.length === 0 ? (
          <EmptyState
            message={query.trim() ? `No claims match “${query.trim()}”.` : "No claims in this view yet."}
            hint={query.trim() ? "Clear the search to see every claim on this page." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Claimant</th>
                  <th className="px-4 py-3">Match score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-small">
                {visible.map((claim) => {
                  const score = scoreByPair.get(`${claim.lost_item_id}:${claim.found_item_id}`);
                  const title =
                    lostTitle.get(claim.lost_item_id) ??
                    foundTitle.get(claim.found_item_id) ??
                    `Lost #${claim.lost_item_id} ↔ Found #${claim.found_item_id}`;
                  return (
                    <tr key={claim.id} className="transition-colors hover:bg-soft">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-soft text-muted">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                              inventory_2
                            </span>
                          </span>
                          <span className="font-semibold text-ink">{title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">User #{claim.user_id}</td>
                      <td className="px-4 py-3.5">
                        {score === undefined ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{score}%</span>
                            <span className="h-2 w-16 overflow-hidden rounded-full bg-soft">
                              <span
                                className="block h-full rounded-full bg-amber"
                                style={{ width: `${score}%` }}
                              />
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          <StatusBadge status={claim.verification_status} />
                          <StatusIndicator status={indicatorFor(claim.verification_status)} label="" />
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button variant="outline" onClick={() => onNavigate("claims")}>
                          Review Claim
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TableFooter page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
