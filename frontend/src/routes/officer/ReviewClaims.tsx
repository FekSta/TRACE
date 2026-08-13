import { useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import { Field, Select, TextArea, TextInput } from "../../components/ui/Field";
import type { Claim } from "../../lib/types";

/** Review pending claims — demo/officer renderClaims(), backed by
 *  GET /claims?verification_status=Pending and POST /claims/{id}/verify
 *  (approve/reject writes a VerificationRecord atomically). */
export default function ReviewClaims() {
  const { show } = useToast();
  const claims = useAuthedFetch<Claim[]>("/claims?verification_status=Pending");

  const [selected, setSelected] = useState<Claim | null>(null);
  const [result, setResult] = useState<"Approved" | "Rejected">("Approved");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);

  if (claims.loading) return <Loading label="Loading claims…" />;

  const list = claims.data ?? [];

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
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Review Claims</h1>
        <p className="mt-1.5 text-sm text-muted">Evaluate ownership evidence and approve or reject pending claims.</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState message="No pending claims to review." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[19px] font-semibold text-ink">Claim #{c.id}</h3>
                  <p className="mt-1 text-xs text-muted">
                    Claimant user #{c.user_id} · submitted {new Date(c.claim_date).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={c.verification_status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 rounded-lg border border-line bg-soft p-3.5 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Lost item</span>
                  <div className="mt-1 text-[13px] font-semibold text-ink">Lost #{c.lost_item_id}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Found item</span>
                  <div className="mt-1 text-[13px] font-semibold text-ink">Found #{c.found_item_id}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2.5 border-t border-line pt-4">
                <Button variant="primary" className="flex-1" onClick={() => { setSelected(c); setResult("Approved"); setNotes(""); setMethod(""); }}>
                  Approve Claim
                </Button>
                <Button variant="danger" className="flex-1" onClick={() => { setSelected(c); setResult("Rejected"); setNotes(""); setMethod(""); }}>
                  Reject Claim
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        title={`${result === "Approved" ? "Approve" : "Reject"} claim #${selected?.id ?? ""}`}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              variant={result === "Approved" ? "primary" : "danger"}
              disabled={busy}
              onClick={decide}
            >
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
              <TextInput placeholder="e.g. Student card check" value={method} onChange={(e) => setMethod(e.target.value)} />
            </Field>
            <Field label="Notes (optional)">
              <TextArea placeholder={result === "Approved" ? "ID matched student record…" : "Reason for rejection…"} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {result === "Approved" && (
              <p className="rounded-lg border border-brand/20 bg-brand-light px-3 py-2.5 text-xs text-brand-dark">
                Approving atomically sets the claim to Approved and reserves the items (Lost → Claimed, Found → Claimed).
                The claimant is also emailed (Module 6).
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
