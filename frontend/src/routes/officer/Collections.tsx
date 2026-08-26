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
import { Field, TextInput } from "../../components/ui/Field";
import type { Claim } from "../../lib/types";

/** Approve collections — demo/officer renderCollections(), backed by
 *  GET /claims?verification_status=Approved and POST /claims/{id}/collect
 *  (writes a CollectionRecord; claim → Completed, items → Closed/Returned). */
export default function Collections() {
  const { show } = useToast();
  const claims = useAuthedFetch<Claim[]>("/claims?verification_status=Approved");

  const [selected, setSelected] = useState<Claim | null>(null);
  const [collectedBy, setCollectedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  if (claims.loading) return <Loading label="Loading approved claims…" />;

  const list = (claims.data ?? []).filter((c) => c.status === "Active");

  async function collect() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/claims/${selected.id}/collect`, {
        collected_by: collectedBy || null,
        remarks: remarks || null,
      });
      show(`Claim #${selected.id} collected — item handed over.`);
      setSelected(null);
      claims.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Collection failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Approve Collections</h1>
        <p className="mt-1.5 text-sm text-muted">Items with approved claims, ready for pickup.</p>
      </div>

      <Card title="Ready for pickup" meta={`${list.length} approved, active claim(s)`} noPadding>
        {list.length === 0 ? (
          <EmptyState message="No approved claims awaiting collection." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Claimant</th>
                  <th className="px-4 py-3">Item pairing</th>
                  <th className="px-4 py-3">Approved on</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {list.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">#{c.id}</td>
                    <td className="px-4 py-3.5">user #{c.user_id}</td>
                    <td className="px-4 py-3.5">
                      Lost #<strong>{c.lost_item_id}</strong> ↔ Found #<strong>{c.found_item_id}</strong>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(c.claim_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.verification_status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="primary"
                        onClick={() => { setSelected(c); setCollectedBy(""); setRemarks(""); }}
                      >
                        Mark as Collected
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={selected !== null}
        title={`Collect claim #${selected?.id ?? ""}`}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={collect}>
              {busy ? "Recording…" : "Confirm Collection"}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="rounded-lg border border-line bg-soft px-3 py-2.5 text-xs leading-relaxed text-muted">
              Handing over Lost #<strong className="text-ink">{selected.lost_item_id}</strong> ↔ Found #
              <strong className="text-ink">{selected.found_item_id}</strong> to user #<strong className="text-ink">{selected.user_id}</strong>.
              This writes a CollectionRecord and completes the claim.
            </p>
            <Field label="Collected by (name)">
              <TextInput placeholder="e.g. Ada Lovelace" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
            </Field>
            <Field label="Remarks (optional)">
              <TextInput placeholder="Identity verified; item handed over" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
