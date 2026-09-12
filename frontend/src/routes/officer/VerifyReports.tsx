import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import { Field, Select } from "../../components/ui/Field";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { LostItem, FoundItem } from "../../lib/types";

const LOST_STATUSES = ["Reported", "Matched", "Claimed", "Closed"];
const FOUND_STATUSES = ["Available", "Claimed", "Returned"];

type LostRow = LostItem & { kind: "lost" };
type FoundRow = FoundItem & { kind: "found" };
type AnyItem = LostRow | FoundRow;

const TABS = [
  { id: "all", label: "All" },
  { id: "lost", label: "Lost" },
  { id: "found", label: "Found" },
];

function asRows(lost: LostItem[], found: FoundItem[]): AnyItem[] {
  return [
    ...lost.map((i) => ({ ...i, kind: "lost" as const })),
    ...found.map((i) => ({ ...i, kind: "found" as const })),
  ].sort((a, b) => b.id - a.id);
}

function locationOf(item: AnyItem): string | null {
  return item.kind === "lost" ? item.location_lost : item.storage_location;
}

function dateOf(item: AnyItem): string | null {
  return item.kind === "lost" ? item.date_lost : item.date_found;
}

/**
 * Review reports — `design/Officer/Officer-Verify-Reports.jpeg`.
 *
 * Tabs are All / Lost / Found, over the two list endpoints this screen already
 * calls. The model has no per-report "verified" state, so the officer actions
 * stay exactly what they were (Review.md §Module 7): **Verify Report** opens
 * the status modal (`PATCH /items/{kind}/{id}`) and **Reject** is the existing
 * destructive confirm (`DELETE /items/{kind}/{id}`).
 *
 * The mockup's amber "Possible Duplicate" pill is deliberately not rendered —
 * there is no duplicate signal in the API payload to drive it honestly.
 */
export default function VerifyReports({ query = "" }: { query?: string }) {
  const { show } = useToast();
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");

  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<AnyItem | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setExpanded(null);
  }, [query, tab]);

  if (lost.loading || found.loading) return <Loading label="Loading reports…" />;

  const allRows = asRows(lost.data ?? [], found.data ?? []);
  const counts = countByTab(allRows, (row) => row.kind);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? allRows.length : counts[t.id] ?? 0,
  }));

  const tabbed = tab === "all" ? allRows : allRows.filter((row) => row.kind === tab);
  const rows = filterRows(tabbed, query, (row) => [
    row.id,
    row.title,
    row.description,
    row.brand,
    row.colour,
    row.status,
    locationOf(row),
    row.kind,
  ]);

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

  async function reject(item: AnyItem) {
    if (!window.confirm(`Reject and delete report #${item.id}? This cannot be undone.`)) return;
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
        <h1 className="font-display text-h1 text-ink">Verify Reports</h1>
        <p className="mt-1.5 text-body text-muted">
          Review new lost and found reports before they enter the workflow.
        </p>
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter reports by type" />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            message={query.trim() ? `No reports match “${query.trim()}”.` : "No reports to review."}
            hint={query.trim() ? "Clear the search or switch back to All." : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((row) => {
            const isOpen = expanded === row.id;
            return (
              <Card key={`${row.kind}-${row.id}`} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-input bg-soft text-muted">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      inventory_2
                    </span>
                  </div>
                  <StatusBadge status={row.kind === "lost" ? "Lost" : "Found"} />
                </div>

                <h3 className="mt-3.5 font-display text-h3 text-ink">{row.title}</h3>
                <p className="mt-0.5 text-small text-muted">
                  Category #{row.category_id} · {row.kind === "lost" ? "Lost" : "Found"} report #{row.id}
                </p>

                <p className={`mt-3 text-body leading-relaxed text-muted ${isOpen ? "" : "line-clamp-2"}`}>
                  {row.description || "No description provided."}
                </p>
                {(row.description?.length ?? 0) > 90 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="mt-1 self-start text-small font-semibold text-amber hover:underline"
                  >
                    {isOpen ? "Read less" : "Read more"}
                  </button>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-small text-muted">
                  {row.brand && <span className="rounded-sm bg-soft px-2 py-1">Brand: {row.brand}</span>}
                  {row.colour && <span className="rounded-sm bg-soft px-2 py-1">Colour: {row.colour}</span>}
                  {locationOf(row) && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-soft px-2 py-1">
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                        location_on
                      </span>
                      {locationOf(row)}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-small text-muted">
                  By User #{row.user_id}
                  {" · "}
                  {dateOf(row) ? `Reported ${dateOf(row)}` : "Date not recorded"}
                </p>

                <div className="mt-4 flex gap-2.5 border-t border-line pt-4">
                  <Button variant="primary" className="flex-1" onClick={() => open(row)}>
                    Verify Report
                  </Button>
                  <Button variant="outline" onClick={() => reject(row)}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      expand_more
                    </span>
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
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
            <div className="rounded-input border border-line bg-soft p-3.5 text-body text-ink">
              <strong>{selected.title}</strong>
              <span className="ml-2 text-small text-muted">
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
