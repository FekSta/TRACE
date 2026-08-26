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
import { Field, Select } from "../../components/ui/Field";
import type { LostItem, FoundItem } from "../../lib/types";

const LOST_STATUSES = ["Reported", "Matched", "Claimed", "Closed"];
const FOUND_STATUSES = ["Available", "Claimed", "Returned"];

type LostRow = LostItem & { kind: "lost" };
type FoundRow = FoundItem & { kind: "found" };
type AnyItem = LostRow | FoundRow;

function asRows(lost: LostItem[], found: FoundItem[]): AnyItem[] {
  return [
    ...lost.map((i) => ({ ...i, kind: "lost" as const })),
    ...found.map((i) => ({ ...i, kind: "found" as const })),
  ].sort((a, b) => b.id - a.id);
}

/** Review reports — demo/officer renderVerify(), mapped onto the real API.
 *  NOTE: the model has no per-report "verified" state; the officer action
 *  is updating the item status (PATCH) or removing the report (DELETE).
 *  The mapping is documented in Review.md §Module 7. */
export default function VerifyReports() {
  const { show } = useToast();
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");

  const [selected, setSelected] = useState<AnyItem | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (lost.loading || found.loading) return <Loading label="Loading reports…" />;

  const rows = asRows(lost.data ?? [], found.data ?? []);

  function open(item: AnyItem) {
    setSelected(item);
    setStatus(item.status);
  }

  async function applyStatus() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.patch(`/items/${selected.kind}/${selected.id}`, { status });
      show(`Report #${selected.id} status → ${status}`);
      setSelected(null);
      lost.reload();
      found.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AnyItem) {
    if (!window.confirm(`Delete report #${item.id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/items/${item.kind}/${item.id}`);
      show(`Report #${item.id} removed.`);
      lost.reload();
      found.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Verify Reports</h1>
        <p className="mt-1.5 text-sm text-muted">Review new lost and found reports before they enter the workflow.</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState message="No reports to review." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <Card key={`${r.kind}-${r.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[19px] font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {r.kind === "lost" ? "Lost" : "Found"} report · #{r.id} · category #{r.category_id}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <p className="mt-3.5 line-clamp-3 text-[13px] leading-relaxed text-muted">
                {r.description || "No description provided."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                {r.kind === "lost" ? (
                  <>
                    {r.brand && <span className="rounded bg-soft px-2 py-1">Brand: {r.brand}</span>}
                    {r.colour && <span className="rounded bg-soft px-2 py-1">Colour: {r.colour}</span>}
                    {r.location_lost && <span className="rounded bg-soft px-2 py-1">📍 {r.location_lost}</span>}
                    {r.date_lost && <span className="rounded bg-soft px-2 py-1">Lost: {r.date_lost}</span>}
                  </>
                ) : (
                  <>
                    {r.brand && <span className="rounded bg-soft px-2 py-1">Brand: {r.brand}</span>}
                    {r.colour && <span className="rounded bg-soft px-2 py-1">Colour: {r.colour}</span>}
                    {r.storage_location && <span className="rounded bg-soft px-2 py-1">📍 {r.storage_location}</span>}
                    {r.date_found && <span className="rounded bg-soft px-2 py-1">Found: {r.date_found}</span>}
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-2.5 border-t border-line pt-4">
                <Button variant="primary" className="flex-1" onClick={() => open(r)}>
                  Update Status
                </Button>
                <Button variant="danger" onClick={() => remove(r)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        title={`Update status — report #${selected?.id ?? ""}`}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy || status === selected?.status} onClick={applyStatus}>
              {busy ? "Saving…" : "Save Status"}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-soft p-3.5 text-sm text-ink">
              <strong>{selected.title}</strong>
              <span className="ml-2 text-xs text-muted">
                ({selected.kind === "lost" ? "lost" : "found"}, currently {selected.status})
              </span>
            </div>
            <Field label="New status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {(selected.kind === "lost" ? LOST_STATUSES : FOUND_STATUSES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
