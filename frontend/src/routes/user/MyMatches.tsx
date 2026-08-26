import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import type { Match, LostItem, FoundItem } from "../../lib/types";

/** Suggested matches on the user's items. Accepting a match IS the claim
 *  submission (Module 5: POST /matches/{id}/accept creates the Claim
 *  in-process). */
export default function MyMatches() {
  const { show } = useToast();
  const matches = useAuthedFetch<Match[]>("/matches");
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const [busy, setBusy] = useState<number | null>(null);

  if (matches.loading) return <Loading label="Loading matches…" />;

  const lostTitle = new Map(lost.data?.map((i) => [i.id, i.title]) ?? []);
  const foundTitle = new Map(found.data?.map((i) => [i.id, i.title]) ?? []);

  const list = (matches.data ?? []).sort((a, b) => Number(b.match_score) - Number(a.match_score));

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
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Action failed", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">My Matches</h1>
        <p className="mt-1.5 text-sm text-muted">
          Suggested pairings between your reports and other users&apos; items. Accepting a match submits an ownership claim.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            message="No matches yet."
            hint="Report items with a clear description and location — the matching engine runs automatically after each report."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((m) => {
            const score = Math.round(Number(m.match_score));
            return (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[19px] font-semibold text-ink">
                      {lostTitle.get(m.lost_item_id) ?? `Lost item #${m.lost_item_id}`}
                      <span className="mx-1.5 text-muted">↔</span>
                      {foundTitle.get(m.found_item_id) ?? `Found item #${m.found_item_id}`}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Lost #<span className="font-semibold text-ink">{m.lost_item_id}</span> · Found #
                      <span className="font-semibold text-ink">{m.found_item_id}</span>
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                {m.match_reason && <p className="mt-3.5 text-[13px] leading-relaxed text-muted">{m.match_reason}</p>}

                <div className="mt-3.5">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">Match confidence</span>
                    <strong className={score >= 60 ? "text-brand" : "text-warning"}>{score}%</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#dce2e8]">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${score}%` }} />
                  </div>
                </div>

                {m.status === "Suggested" && (
                  <div className="mt-4 flex gap-2.5 border-t border-line pt-4">
                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={busy === m.id}
                      onClick={() => decide(m, "accept")}
                    >
                      {busy === m.id ? "Working…" : "Accept & Submit Claim"}
                    </Button>
                    <Button variant="danger" disabled={busy === m.id} onClick={() => decide(m, "reject")}>
                      Reject
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
