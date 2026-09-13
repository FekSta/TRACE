import { useEffect, useState } from "react";
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
import TableFooter from "../../components/ui/TableFooter";
import { Field, TextInput } from "../../components/ui/Field";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { Claim, LostItem, FoundItem } from "../../lib/types";

const TABS = [
  { id: "ready", label: "Ready for pickup" },
  { id: "collected", label: "Collected" },
  { id: "all", label: "All" },
];

function tabOf(claim: Claim): string {
  return claim.status === "Completed" ? "collected" : "ready";
}

/**
 * Approve collections — `design/Officer/Officer-Approve-Collection.jpeg`.
 *
 * Table follows `design/TableDesign.md` (single card module, thumbnail +
 * two-line item cell, status badge, count + pagination footer). The existing
 * collection flow is unchanged: `POST /claims/{id}/collect` behind the modal.
 */
export default function Collections({ query = "" }: { query?: string }) {
  const { show } = useToast();
  const claims = useAuthedFetch<Claim[]>("/claims?verification_status=Approved");
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");

  const [tab, setTab] = useState("ready");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [selected, setSelected] = useState<Claim | null>(null);
  const [collectedBy, setCollectedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  if (claims.loading) return <Loading label="Loading approved claims…" />;

  const approved = claims.data ?? [];
  const lostTitle = new Map((lost.data ?? []).map((i) => [i.id, i.title]));
  const foundTitle = new Map((found.data ?? []).map((i) => [i.id, i.title]));

  const counts = countByTab(approved, tabOf);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? approved.length : counts[t.id] ?? 0,
  }));

  const tabbed = tab === "all" ? approved : approved.filter((c) => tabOf(c) === tab);
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

  async function collect() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/claims/${selected.id}/collect`, {
        collected_by: collectedBy || null,
        remarks: remarks || null,
      });
      show("Claim collected — item handed over.");
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
        <h1 className="font-display text-h1 text-ink">Approve Collections</h1>
        <p className="mt-1.5 text-body text-muted">Items with approved claims, ready for pickup.</p>
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter collections" />

      <Card title="Collections" meta={`${approved.length} approved claim(s)`} noPadding>
        {rows.length === 0 ? (
          <EmptyState
            message={query.trim() ? `No collections match “${query.trim()}”.` : "No approved claims in this view."}
            hint={query.trim() ? "Clear the search or switch back to All." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Claim approved on</th>
                  <th className="px-4 py-3">ID verification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-small">
                {visible.map((c) => {
                  const title =
                    c.lost_item_title ??
                    lostTitle.get(c.lost_item_id) ??
                    c.found_item_title ??
                    foundTitle.get(c.found_item_id) ??
                    "Item pairing";
                  const collected = c.status === "Completed";
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-soft">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-soft text-muted">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                              inventory_2
                            </span>
                          </span>
                          <span className="block font-semibold text-ink">{title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">{c.claimant_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-muted">
                        {new Date(c.claim_date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          <StatusBadge status={c.verification_status} />
                          <StatusIndicator status="Approved" label="" />
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="primary"
                          disabled={collected}
                          onClick={() => {
                            setSelected(c);
                            setCollectedBy("");
                            setRemarks("");
                          }}
                        >
                          {collected ? "Already collected" : "Mark as Collected"}
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

      <Modal
        open={selected !== null}
        title="Collect claim"
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
            <p className="rounded-input border border-line bg-soft px-3 py-2.5 text-small leading-relaxed text-muted">
              Handing over “<strong className="text-ink">{selected.lost_item_title ?? "the lost item"}</strong>”
              ↔ “<strong className="text-ink">{selected.found_item_title ?? "the found item"}</strong>” to{" "}
              <strong className="text-ink">{selected.claimant_name ?? "the claimant"}</strong>. This writes a
              CollectionRecord and completes the claim.
            </p>
            <Field label="Collected by (name)">
              <TextInput
                placeholder="e.g. Ada Lovelace"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
              />
            </Field>
            <Field label="Remarks (optional)">
              <TextInput
                placeholder="Identity verified; item handed over"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
