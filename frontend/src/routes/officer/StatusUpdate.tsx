import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import { Select } from "../../components/ui/Field";
import type { LostItem, FoundItem } from "../../lib/types";

const LOST_STATUSES = ["Reported", "Matched", "Claimed", "Closed"];
const FOUND_STATUSES = ["Available", "Claimed", "Returned"];

type Row = { kind: "lost" | "found"; id: number; title: string; status: string; location: string | null };

/** Update item status — demo/officer renderStatus(), backed by
 *  PATCH /items/lost/{id} | /items/found/{id} (Officer is unscoped). */
export default function StatusUpdate() {
  const { show } = useToast();
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");

  if (lost.loading || found.loading) return <Loading label="Loading items…" />;

  const rows: Row[] = [
    ...(lost.data ?? []).map((i) => ({ kind: "lost" as const, id: i.id, title: i.title, status: i.status, location: i.location_lost })),
    ...(found.data ?? []).map((i) => ({ kind: "found" as const, id: i.id, title: i.title, status: i.status, location: i.storage_location })),
  ].sort((a, b) => b.id - a.id);

  async function updateStatus(row: Row, status: string) {
    if (status === row.status) return;
    try {
      await api.patch(`/items/${row.kind}/${row.id}`, { status });
      show(`Item #${row.id} status → ${status}`);
      lost.reload();
      found.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Update failed", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Update Item Status</h1>
        <p className="mt-1.5 text-sm text-muted">Track items through the recovery workflow.</p>
      </div>

      <Card title="All items" meta={`${rows.length} record(s)`} noPadding>
        {rows.length === 0 ? (
          <EmptyState message="No items registered yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink">{r.title}</span>
                      <span className="ml-2 text-muted">#{r.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.kind === "lost" ? "Lost" : "Found"} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{r.location ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <Select compact value={r.status} onChange={(e) => updateStatus(r, e.target.value)}>
                        {(r.kind === "lost" ? LOST_STATUSES : FOUND_STATUSES).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
