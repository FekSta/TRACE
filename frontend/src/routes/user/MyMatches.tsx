import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import TableFooter from "../../components/ui/TableFooter";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { Match, LostItem, FoundItem, Claim } from "../../lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "Suggested", label: "Suggested" },
  { id: "Accepted", label: "Accepted" },
  { id: "Rejected", label: "Rejected" },
];

type StepId = "suggested" | "submitted" | "review" | "recovered";

const STEPS: { id: StepId; label: string }[] = [
  { id: "suggested", label: "Suggested" },
  { id: "submitted", label: "Claim Submitted" },
  { id: "review", label: "Under Review" },
  { id: "recovered", label: "Recovered" },
];

/** How far a match has travelled — derived from real fields only:
 *  `Match.status` plus the claim created by accepting it (if any). */
function reachedStep(match: Match, claim: Claim | undefined): StepId {
  if (claim && (claim.status === "Completed" || claim.collection_date !== null)) return "recovered";
  if (claim && claim.verification_status === "Pending") return "review";
  if (match.status === "Accepted") return "submitted";
  return "suggested";
}

const STEP_ORDER: StepId[] = ["suggested", "submitted", "review", "recovered"];

function ProgressTracker({ reached }: { reached: StepId }) {
  const reachedIndex = STEP_ORDER.indexOf(reached);
  return (
    <ol className="flex w-full min-w-[320px] items-start justify-between gap-2">
      {STEPS.map((step, index) => {
        const done = index <= reachedIndex;
        return (
          <li key={step.id} className="flex flex-1 flex-col items-center text-center">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full ${
                done ? "bg-success text-white" : "bg-soft text-muted"
              }`}
              aria-hidden="true"
            >
              {done ? (
                <span className="material-symbols-outlined text-[18px]">check</span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-line" />
              )}
            </span>
            <span
              className={`mt-1.5 text-small leading-tight ${done ? "font-semibold text-ink" : "text-muted"}`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * My Matches — `design/Track-Claim.jpeg` visual language (owner decision
 * 2026-09-12): one full-width row per potential item match, each with a
 *  progress tracker (Suggested → Claim Submitted → Under Review → Recovered).
 *
 * Accepting a match IS the claim submission (Module 5), so the accept/reject
 * calls are unchanged: `POST /matches/{id}/accept|reject`.
 */
export default function MyMatches({ query = "" }: { query?: string }) {
  const { show } = useToast();
  const matches = useAuthedFetch<Match[]>("/matches");
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");

  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  if (matches.loading) return <Loading label="Loading matches…" />;

  const lostTitle = new Map((lost.data ?? []).map((i) => [i.id, i.title]));
  const foundTitle = new Map((found.data ?? []).map((i) => [i.id, i.title]));
  const claimByPair = new Map(
    (claims.data ?? []).map((c) => [`${c.lost_item_id}:${c.found_item_id}`, c]),
  );

  const allMatches = (matches.data ?? []).sort((a, b) => Number(b.match_score) - Number(a.match_score));

  const counts = countByTab(allMatches, (m) => m.status);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? allMatches.length : counts[t.id] ?? 0,
  }));

  const tabbed = tab === "all" ? allMatches : allMatches.filter((m) => m.status === tab);
  const rows = filterRows(tabbed, query, (m) => [
    m.id,
    m.lost_item_id,
    m.found_item_id,
    m.status,
    m.match_score,
    m.match_reason,
    lostTitle.get(m.lost_item_id),
    foundTitle.get(m.found_item_id),
  ]);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  async function decide(match: Match, action: "accept" | "reject") {
    setBusy(match.id);
    try {
      await api.post(`/matches/${match.id}/${action}`);
      show(
        action === "accept"
          ? "Match accepted — your claim has been submitted."
          : "Match rejected.",
      );
      matches.reload();
      claims.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Action failed", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h1 text-ink">My Matches</h1>
        <p className="mt-1.5 text-body text-muted">
          Suggested pairings between your reports and other users&apos; items. Accepting a match submits an
          ownership claim.
        </p>
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter matches by status" />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            message={query.trim() ? `No matches match “${query.trim()}”.` : "No matches in this view."}
            hint={
              query.trim() || allMatches.length > 0 ? (
                "Clear the search or switch back to All."
              ) : (
                "Report items with a clear description and location — the matching engine runs automatically after each report."
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visible.map((match) => {
            const score = Math.round(Number(match.match_score));
            const claim = claimByPair.get(`${match.lost_item_id}:${match.found_item_id}`);
            const lostName =
              match.lost_item_title ?? lostTitle.get(match.lost_item_id) ?? "Lost item";
            const foundName =
              match.found_item_title ?? foundTitle.get(match.found_item_id) ?? "Found item";
            const reached = reachedStep(match, claim);
            const lastUpdate = claim ? new Date(claim.claim_date) : new Date(match.generated_at);

            return (
              <Card key={match.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-input bg-soft text-muted">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        inventory_2
                      </span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-body text-ink">{lostName}</strong>
                        <StatusBadge status="Lost" />
                        <span className="text-muted" aria-hidden="true">
                          ↔
                        </span>
                        <strong className="text-body text-ink">{foundName}</strong>
                        <StatusBadge status="Found" />
                      </div>
                      <p className="mt-1 text-small text-muted">
                        {score}% confidence · {match.status}
                      </p>
                      <p className="mt-0.5 text-small text-muted">
                        Last update:{" "}
                        {lastUpdate.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="lg:w-[420px]">
                    <ProgressTracker reached={reached} />
                  </div>

                  {match.status === "Suggested" && (
                    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:w-[210px] lg:grid-cols-1">
                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={busy === match.id}
                        onClick={() => decide(match, "accept")}
                      >
                        {busy === match.id ? "Working…" : "Accept & Submit Claim"}
                      </Button>
                      <Button
                        variant="danger"
                        className="w-full"
                        disabled={busy === match.id}
                        onClick={() => decide(match, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {match.match_reason && (
                  <p className="mt-3 border-t border-line pt-3 text-small text-muted">{match.match_reason}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <TableFooter page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </div>
    </div>
  );
}
