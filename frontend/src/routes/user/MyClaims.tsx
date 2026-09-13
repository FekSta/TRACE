import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import SearchInput from "../../components/ui/SearchInput";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { Claim } from "../../lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "review", label: "Under Review" },
  { id: "approved", label: "Approved" },
  { id: "recovered", label: "Recovered" },
  { id: "rejected", label: "Rejected" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Claim stage, derived from real fields only. */
function tabOf(claim: Claim): string {
  if (claim.collection_date !== null || claim.status === "Completed") return "recovered";
  if (claim.verification_status === "Rejected") return "rejected";
  if (claim.verification_status === "Approved") return "approved";
  return "review";
}

/**
 * Track Claims — search + filter tabs per `design/Track-Claim.jpeg`. The card
 * layout itself is unchanged (owner decision 2026-09-12: the Track-Claim
 * stepper design is realised on My Matches instead).
 *
 * The search control sits under the page heading here, mirroring the mockup,
 * rather than in the portal topbar.
 */
export default function MyClaims({
  query = "",
  onQueryChange,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  const claims = useAuthedFetch<Claim[]>("/claims");
  const [tab, setTab] = useState("all");

  if (claims.loading) return <Loading label="Loading claims…" />;

  const allClaims = claims.data ?? [];
  const counts = countByTab(allClaims, tabOf);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? allClaims.length : counts[t.id] ?? 0,
  }));

  const tabbed = tab === "all" ? allClaims : allClaims.filter((c) => tabOf(c) === tab);
  const list = filterRows(tabbed, query, (c) => [
    c.id,
    c.lost_item_id,
    c.found_item_id,
    c.status,
    c.verification_status,
    c.verification_notes,
    fmtDate(c.claim_date),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h1 text-ink">Track Claims</h1>
        <p className="mt-1.5 text-body text-muted">
          Follow each claim from submission, through officer verification, to collection.
        </p>
      </div>

      <div className="max-w-xl">
        <SearchInput
          value={query}
          onChange={onQueryChange ?? (() => undefined)}
          ariaLabel="Search your claims"
          placeholder="Search claims…"
        />
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter claims by stage" />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            message={
              query.trim()
                ? `No claims match “${query.trim()}”.`
                : allClaims.length === 0
                  ? "No claims submitted yet."
                  : "No claims in this view."
            }
            hint={
              query.trim() || allClaims.length > 0 ? (
                "Clear the search or switch back to All."
              ) : (
                "Accept one of your matches to submit an ownership claim — it appears here immediately."
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} title={c.lost_item_title ?? "Ownership claim"} meta={fmtDate(c.claim_date)}>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-input border border-line bg-soft p-3.5">
                  <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
                    Item pairing
                  </span>
                  <div className="mt-1.5 text-body font-semibold text-ink">
                    {c.lost_item_title ?? "Lost item"}
                    <span className="mx-1 text-muted">↔</span>
                    {c.found_item_title ?? "Found item"}
                  </div>
                </div>
                <div className="rounded-input border border-line bg-soft p-3.5">
                  <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
                    Verification
                  </span>
                  <div className="mt-2">
                    <StatusBadge status={c.verification_status} />
                  </div>
                </div>
              </div>

              <ol className="flex items-center gap-2 text-small">
                {[
                  { label: "Submitted", done: true, date: fmtDate(c.claim_date) },
                  {
                    label: "Verified",
                    done: c.verification_status !== "Pending",
                    date: c.verification_status !== "Pending" ? "done" : "",
                  },
                  { label: "Collected", done: c.collection_date !== null, date: fmtDate(c.collection_date) },
                ].map((step, idx) => (
                  <li key={step.label} className="flex flex-1 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${step.done ? "bg-ink" : "bg-line"}`} />
                    <span className={step.done ? "font-semibold text-ink" : "text-muted"}>{step.label}</span>
                    {idx < 2 && <span className="h-px flex-1 bg-line" />}
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-small">
                <span className="text-muted">
                  Claim status: <strong className="text-ink">{c.status}</strong>
                  {c.verification_notes && <span className="ml-1 text-muted">· {c.verification_notes}</span>}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
