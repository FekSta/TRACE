import { useEffect, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/api";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import FilterTabs from "../../components/ui/FilterTabs";
import TableFooter from "../../components/ui/TableFooter";
import { Select } from "../../components/ui/Field";
import { countByTab, filterRows } from "../../lib/filterRows";
import type { LostItem, FoundItem, Category } from "../../lib/types";

const LOST_STATUSES = ["Reported", "Matched", "Claimed", "Closed"];
const FOUND_STATUSES = ["Available", "Claimed", "Returned"];

const TABS = [
  { id: "all", label: "All" },
  { id: "lost", label: "Lost" },
  { id: "found", label: "Found" },
];

interface Row {
  kind: "lost" | "found";
  id: number;
  title: string;
  status: string;
  location: string | null;
  reporterName: string | null;
  categoryId: number;
  date: string | null;
}

/** The action control is a "louder" version of the status badge, per
 *  `design/TableDesign.md` §3.4 — same hue, stronger fill. */
function statusActionClass(status: string): string {
  switch (status) {
    case "Matched":
      return "bg-warning-soft text-warning";
    case "Claimed":
      return "bg-info-soft text-info";
    case "Available":
    case "Returned":
      return "bg-success/10 text-success-ink";
    default:
      return "bg-soft text-muted";
  }
}

/**
 * Update item status — `design/Officer/Officer-Update-Status.jpeg`, laid out
 * per `design/TableDesign.md`. The write path is unchanged:
 * `PATCH /items/{kind}/{id}`.
 *
 * `Last updated` renders the report date (`date_lost` / `date_found`), because
 * lost/found items have no timestamp column yet — that gap is tracked in
 * `prompts/agent-prompt-display-enrichment.md`.
 */
export default function StatusUpdate({ query = "" }: { query?: string }) {
  const { show } = useToast();
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const categories = useAuthedFetch<Category[]>("/categories");

  const [tab, setTab] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setPage(1);
  }, [query, tab, categoryId]);

  if (lost.loading || found.loading) return <Loading label="Loading items…" />;

  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.category_name]));

  const allRows: Row[] = [
    ...(lost.data ?? []).map((i) => ({
      kind: "lost" as const,
      id: i.id,
      title: i.title,
      status: i.status,
      location: i.location_lost,
      reporterName: i.reporter_name,
      categoryId: i.category_id,
      date: i.date_lost,
    })),
    ...(found.data ?? []).map((i) => ({
      kind: "found" as const,
      id: i.id,
      title: i.title,
      status: i.status,
      location: i.storage_location,
      reporterName: i.reporter_name,
      categoryId: i.category_id,
      date: i.date_found,
    })),
  ].sort((a, b) => b.id - a.id);

  const counts = countByTab(allRows, (row) => row.kind);
  const tabs = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? allRows.length : counts[t.id] ?? 0,
  }));

  const tabbed = tab === "all" ? allRows : allRows.filter((row) => row.kind === tab);
  const inCategory =
    categoryId === "all" ? tabbed : tabbed.filter((row) => String(row.categoryId) === categoryId);
  const rows = filterRows(inCategory, query, (row) => [
    row.id,
    row.title,
    row.status,
    row.location,
    row.kind,
    categoryName.get(row.categoryId),
    row.date,
  ]);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  async function updateStatus(row: Row, status: string) {
    if (status === row.status) return;
    try {
      await api.patch(`/items/${row.kind}/${row.id}`, { status });
      show(`“${row.title}” status → ${status}`);
      lost.reload();
      found.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Update failed", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-ink">Items Requiring Status Review</h1>
          <p className="mt-1.5 text-body text-muted">Track items through the recovery workflow.</p>
        </div>
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
          className="w-auto"
        >
          <option value="all">All Categories</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.category_name}
            </option>
          ))}
        </Select>
      </div>

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Filter items by kind" />

      <Card title="Items" meta={`${rows.length} record(s)`} noPadding>
        {rows.length === 0 ? (
          <EmptyState
            message={query.trim() ? `No items match “${query.trim()}”.` : "No items in this view."}
            hint={query.trim() ? "Clear the search or switch back to All." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Item details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current status</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Update action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-small">
                {visible.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="transition-colors hover:bg-soft">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-soft text-muted">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                            inventory_2
                          </span>
                        </span>
                        <span>
                          <span className="block font-semibold text-ink">{row.title}</span>
                          <span className="block text-small text-muted">
                            Reported by {row.reporterName ?? "—"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{categoryName.get(row.categoryId) ?? "Uncategorised"}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{row.date ?? "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <select
                        value={row.status}
                        aria-label={`Update status for ${row.title}`}
                        onChange={(e) => updateStatus(row, e.target.value)}
                        className={`ml-auto block rounded-full border border-transparent px-3 py-2 text-small font-semibold outline-none transition-colors focus:border-amber focus:ring-[3px] focus:ring-amber/15 ${statusActionClass(row.status)}`}
                      >
                        {(row.kind === "lost" ? LOST_STATUSES : FOUND_STATUSES).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TableFooter page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}
