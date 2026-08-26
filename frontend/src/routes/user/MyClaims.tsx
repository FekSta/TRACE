import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import type { Claim } from "../../lib/types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Track claim status — GET /claims (scoped to the caller), showing the
 *  verification and workflow state of every claim the user has submitted. */
export default function MyClaims() {
  const claims = useAuthedFetch<Claim[]>("/claims");

  if (claims.loading) return <Loading label="Loading claims…" />;

  const list = claims.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Track Claims</h1>
        <p className="mt-1.5 text-sm text-muted">
          Follow each claim from submission, through officer verification, to collection.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            message="No claims submitted yet."
            hint="Accept one of your matches to submit an ownership claim — it appears here immediately."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} title={`Claim #${c.id}`} meta={fmtDate(c.claim_date)}>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-soft p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Item pairing</span>
                  <div className="mt-1.5 text-[13px] font-semibold text-ink">
                    Lost #<span className="text-ink">{c.lost_item_id}</span>
                    <span className="mx-1 text-muted">↔</span>
                    Found #<span className="text-ink">{c.found_item_id}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-soft p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Verification</span>
                  <div className="mt-2">
                    <StatusBadge status={c.verification_status} />
                  </div>
                </div>
              </div>

              <ol className="flex items-center gap-2 text-[11px]">
                {[
                  { label: "Submitted", done: true, date: fmtDate(c.claim_date) },
                  { label: "Verified", done: c.verification_status !== "Pending", date: c.verification_status !== "Pending" ? "done" : "" },
                  { label: "Collected", done: c.collection_date !== null, date: fmtDate(c.collection_date) },
                ].map((step, idx) => (
                  <li key={step.label} className="flex flex-1 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${step.done ? "bg-brand" : "bg-line"}`} />
                    <span className={step.done ? "font-semibold text-ink" : "text-muted"}>{step.label}</span>
                    {idx < 2 && <span className="h-px flex-1 bg-line" />}
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-xs">
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
