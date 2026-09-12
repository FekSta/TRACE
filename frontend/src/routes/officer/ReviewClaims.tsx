import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import StatusIndicator from "../../components/ui/StatusIndicator";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import { Field, Select, TextArea, TextInput } from "../../components/ui/Field";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { Claim, LostItem, FoundItem, Match } from "../../lib/types";

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

/**
 * Review claims — `design/Officer/Officer-Review-Claims.png`.
 *
 * Cards carry the item, the claim id, the verification indicator, the
 * **match confidence** (joined from `GET /matches` by the lost/found pair) and
 * the **identifying features** (the lost item's own description), then the
 * approve/reject actions.
 *
 * Two mockup blocks are deliberately absent because nothing stores them:
 * claimant email/phone (no user endpoint for officers — `User #{id}` is shown)
 * and the *Proof of ownership* file chips (attachments exist only for items,
 * never for claims). Both are recorded in `Notes.md` §13.5 and scoped in
 * `prompts/agent-prompt-display-enrichment.md`.
 */
export default function ReviewClaims({ query = "" }: { query?: string }) {
  const { show } = useToast();
  const claims = useAuthedFetch<Claim[]>("/claims");
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const matches = useAuthedFetch<Match[]>("/matches");

  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<Claim | null>(null);
  const [result, setResult] = useState<"Approved" | "Rejected">("Approved");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);

  if (claims.loading) return <Loading label="Loading claims…" />;

  const allClaims = claims.data ?? [];
  const lostItems = Array.isArray(lost.data) ? lost.data : [];
  const foundItems = Array.isArray(found.data) ? found.data : [];
  const allMatches = Array.isArray(matches.data) ? matches.data : [];

  const lostById = new Map(lostItems.map((i) => [i.id, i]));
  const foundById = new Map(foundItems.map((i) => [i.id, i]));
  const scoreByPair = new Map(
    allMatches.map((m) => [`${m.lost_item_id}:${m.found_item_id}`, Math.round(Number(m.match_score))]),
  );

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
    c.user_id,
    c.verification_status,
    c.status,
    c.verification_notes,
    lostById.get(c.lost_item_id)?.title,
    foundById.get(c.found_item_id)?.title,
  ]);

  async function decide() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/claims/${selected.id}/verify`, {
        result,
        notes: notes || null,
        verification_method: method || null,
      });
      show(`Claim #${selected.id} ${result === "Approved" ? "approved" : "rejected"}.`);
      setSelected(null);
      claims.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Decision failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h1 text-ink">Review Claims</h1>
        <p className="mt-1.5 text-body text-muted">
          Evaluate ownership evidence and approve or reject pending claims.
        </p>
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter claims by verification" />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            message={query.trim() ? `No claims match “${query.trim()}”.` : "No claims in this view."}
            hint={query.trim() ? "Clear the search or switch back to All." : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((c) => {
            const lostItem = lostById.get(c.lost_item_id);
            const foundItem = foundById.get(c.found_item_id);
            const score = scoreByPair.get(`${c.lost_item_id}:${c.found_item_id}`);
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-input bg-soft text-muted">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      inventory_2
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-h3 text-ink">
                      {lostItem?.title ?? `Lost item #${c.lost_item_id}`}
                    </h3>
                    <p className="mt-0.5 text-small text-muted">Claim #{c.id}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status="Found" />
                    <StatusIndicator status={indicatorFor(c.verification_status)} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 rounded-input border border-line bg-soft p-3.5 sm:grid-cols-2">
                  <div>
                    <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
                      Claimant
                    </span>
                    <div className="mt-1 text-body font-semibold text-ink">User #{c.user_id}</div>
                    <p className="mt-0.5 text-small text-muted">
                      {new Date(c.claim_date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
                        Match confidence
                      </span>
                      <strong className="text-body text-amber">{score === undefined ? "—" : `${score}%`}</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-amber transition-all"
                        style={{ width: `${score ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
                    Identifying features
                  </span>
                  <p className="mt-1.5 rounded-input border border-line bg-navy-soft px-3.5 py-3 text-body leading-relaxed text-ink">
                    {lostItem?.description
                      ? `“${lostItem.description}”`
                      : "No identifying features were recorded on the lost item report."}
                  </p>
                  {lostItem && (lostItem.brand || lostItem.colour || lostItem.location_lost) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-small text-muted">
                      {lostItem.brand && <span className="rounded-sm bg-soft px-2 py-1">Brand: {lostItem.brand}</span>}
                      {lostItem.colour && <span className="rounded-sm bg-soft px-2 py-1">Colour: {lostItem.colour}</span>}
                      {lostItem.location_lost && (
                        <span className="rounded-sm bg-soft px-2 py-1">Lost at {lostItem.location_lost}</span>
                      )}
                      {foundItem?.storage_location && (
                        <span className="rounded-sm bg-soft px-2 py-1">Held at {foundItem.storage_location}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-small text-muted">
                    {c.verification_notes ?? `Submitted ${new Date(c.claim_date).toLocaleString()}`}
                  </span>
                  {c.verification_status === "Pending" ? (
                    <div className="flex gap-2.5">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setSelected(c);
                          setResult("Approved");
                          setNotes("");
                          setMethod("");
                        }}
                      >
                        Approve Claim
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setSelected(c);
                          setResult("Rejected");
                          setNotes("");
                          setMethod("");
                        }}
                      >
                        Reject Claim
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge status={c.verification_status} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={selected !== null}
        title={`${result === "Approved" ? "Approve" : "Reject"} claim #${selected?.id ?? ""}`}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant={result === "Approved" ? "primary" : "danger"} disabled={busy} onClick={decide}>
              {busy ? "Submitting…" : `Confirm ${result}`}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <Field label="Decision">
              <Select value={result} onChange={(e) => setResult(e.target.value as "Approved" | "Rejected")}>
                <option value="Approved">Approved — ownership confirmed</option>
                <option value="Rejected">Rejected — ownership not confirmed</option>
              </Select>
            </Field>
            <Field label="Verification method (optional)">
              <TextInput
                placeholder="e.g. Student card check"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              />
            </Field>
            <Field label="Notes (optional)">
              <TextArea
                placeholder={result === "Approved" ? "ID matched student record…" : "Reason for rejection…"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            {result === "Approved" && (
              <p className="rounded-input border border-success/30 bg-success/10 px-3 py-2.5 text-small text-success-ink">
                Approving atomically sets the claim to Approved and reserves the items (Lost → Claimed, Found →
                Claimed). The claimant is also emailed (Module 6).
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
