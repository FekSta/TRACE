import { Fragment, useMemo, useState } from "react";
import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { Field, Select, TextInput } from "../../components/ui/Field";
import {
  REPORTS,
  REPORT_TYPE_OPTIONS,
  humaniseKey,
  reportToCsv,
  type ReportColumn,
  type ReportTypeId,
} from "./reportConfig";
import type { Category, ReportResponse, ReportRow } from "../../lib/types";

/**
 * Admin Reports — the Administrator "Generate Reports" flow
 * (`assets/diagrams/data-flow.md` §3), backed by `GET /dashboard/reports`.
 *
 * One shared screen parameterised by report type (Review.md "Admin Reports
 * page"): a results grid docked at the top, a "Configure Report" panel below
 * with Filter / Sort According To / Sorting Order groups, and two actions
 * (Generate + Clear Filter). Layout and interaction pattern follow the
 * reference screenshots; the visual skin is TRACE Design System v1.0.
 */

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  categoryId: string;
  role: string;
  userId: string;
  officerId: string;
  verificationStatus: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

function defaultFilters(type: ReportTypeId): FilterState {
  return {
    dateFrom: "",
    dateTo: "",
    status: "",
    categoryId: "",
    role: "",
    userId: "",
    officerId: "",
    verificationStatus: "",
    sortBy: REPORTS[type].defaultSortBy,
    sortOrder: "desc",
  };
}

function buildPath(type: ReportTypeId, filters: FilterState): string {
  const params = new URLSearchParams({
    type,
    sort_by: filters.sortBy,
    sort_order: filters.sortOrder,
  });
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("category_id", filters.categoryId);
  if (filters.role) params.set("role", filters.role);
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.officerId) params.set("officer_id", filters.officerId);
  if (filters.verificationStatus) params.set("verification_status", filters.verificationStatus);
  return `/dashboard/reports?${params.toString()}`;
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LEGEND = [
  {
    dot: "bg-success",
    title: "Approved / returned",
    values: "Active, Approved, Available, Accepted, Returned, Completed, Closed, Found",
  },
  { dot: "bg-info", title: "Claimed / verifying", values: "Claimed, Verifying" },
  { dot: "bg-warning", title: "Matched / awaiting action", values: "Matched, Pending, Suggested, Lost" },
  { dot: "bg-muted", title: "Reported / inactive", values: "Reported, Suspended, Inactive, Archived" },
  { dot: "bg-danger", title: "Rejected / cancelled", values: "Rejected, Cancelled" },
];

/** Status colour key — mandatory because the grid uses colour-coded badges. */
function StatusLegend() {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
        Legend — status colours
      </span>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {STATUS_LEGEND.map((item) => (
          <div key={item.title} className="flex items-center gap-2 text-small text-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
            <span className="font-semibold text-ink">{item.title}:</span>
            <span>{item.values}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCell(key: string, value: ReportRow[string]) {
  if (value === null || value === undefined || value === "") {
    // "Collected" is literally blank until collection; everything else shows a dash.
    return key === "collected" ? "" : <span className="text-muted">—</span>;
  }
  if (key === "status" || key === "verification_status") {
    return <StatusBadge status={String(value)} />;
  }
  return <span className="text-ink">{String(value)}</span>;
}

function SkeletonRows({ columns, lines = 5 }: { columns: number; lines?: number }) {
  return (
    <>
      {Array.from({ length: lines }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3.5">
              <span className="block h-3 w-full max-w-[140px] rounded-sm bg-soft" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Click-to-expand detail so extra fields never widen the default grid. */
function RowDetail({ columns, row }: { columns: ReportColumn[]; row: ReportRow }) {
  const labels = new Map(columns.map((column) => [column.key, column.label]));
  return (
    <div>
      <span className="text-small font-semibold uppercase tracking-[0.06em] text-muted">
        Record detail
      </span>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-small sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(row).map(([key, value]) => (
          <div key={key}>
            <dt className="text-muted">
              {labels.get(key) ?? (key === "id" ? "Record ID" : humaniseKey(key))}
            </dt>
            <dd className="font-semibold text-ink">
              {value === null || value === "" ? "—" : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportTypeId>("users");
  const [draft, setDraft] = useState<FilterState>(() => defaultFilters("users"));
  const [applied, setApplied] = useState<FilterState>(() => defaultFilters("users"));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const config = REPORTS[reportType];
  const path = useMemo(() => buildPath(reportType, applied), [reportType, applied]);
  const report = useAuthedFetch<ReportResponse>(path);

  // Filter pickers reuse the same reports endpoint — no new routes. All users
  // feed "Reported By"/"Found By"; Officers only feed the Claims officer picker.
  const categories = useAuthedFetch<Category[]>("/categories");
  const users = useAuthedFetch<ReportResponse>(
    "/dashboard/reports?type=users&sort_by=last_name&sort_order=asc",
  );
  const officers = useAuthedFetch<ReportResponse>(
    "/dashboard/reports?type=users&role=Officer&sort_by=last_name&sort_order=asc",
  );

  const rows = report.data?.rows ?? [];
  const categoryOptions = categories.data ?? [];
  const userOptions = users.data?.rows ?? [];
  const officerOptions = officers.data?.rows ?? [];

  function changeType(next: ReportTypeId) {
    if (next === reportType) return;
    // Switching report type reloads columns/filters/sorts and resets state.
    const reset = defaultFilters(next);
    setReportType(next);
    setDraft(reset);
    setApplied(reset);
    setExpandedId(null);
  }

  function generate() {
    const nextPath = buildPath(reportType, draft);
    const unchanged = nextPath === path;
    setApplied({ ...draft });
    setExpandedId(null);
    // Re-running the same query still refreshes the grid + timestamp.
    if (unchanged) report.reload();
  }

  function clearFilter() {
    const reset = defaultFilters(reportType);
    setDraft(reset);
    setApplied(reset);
    setExpandedId(null);
  }

  function exportCsv() {
    const csv = reportToCsv(config.columns, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trace-${reportType.replace("_", "-")}-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const generatedLabel = report.loading
    ? "Generating…"
    : report.data
      ? `Generated: ${formatStamp(report.data.generated_at)}`
      : "Not generated yet";

  return (
    <div className="space-y-4">
      {/* Sticky header — title, timestamp, report-type selector, global actions */}
      <div className="sticky top-[72px] z-[5] -mx-2 flex flex-wrap items-end justify-between gap-4 bg-canvas px-2 pb-3 pt-1">
        <div>
          <h1 className="font-display text-h1 text-ink">{config.title}</h1>
          <p className="mt-1.5 text-body text-muted">{generatedLabel}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="report-type" className="mb-1.5 block text-small font-semibold text-ink">
              Report type
            </label>
            <Select
              id="report-type"
              compact
              value={reportType}
              onChange={(event) => changeType(event.target.value as ReportTypeId)}
            >
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={report.loading || rows.length === 0}>
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </Button>
          <Button variant="outline" onClick={clearFilter}>
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Clear Filter
          </Button>
        </div>
      </div>

      {report.error && (
        <div
          role="alert"
          className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-body text-danger"
        >
          {report.error}
        </div>
      )}

      {/* Results grid — the visual majority of the screen */}
      <Card
        title={`${config.title} — ${rows.length} record${rows.length === 1 ? "" : "s"}`}
        meta={report.data ? `as at ${formatStamp(report.data.generated_at)}` : undefined}
        noPadding
      >
        {/* Bounded height + both-axis scroll: long reports scroll in place
            instead of stretching the page, with the header row pinned. */}
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-[1] bg-soft">
              <tr className="bg-soft text-small font-semibold uppercase tracking-[0.06em] text-muted">
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap bg-soft px-4 py-3 font-semibold"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-small">
              {report.loading ? (
                <SkeletonRows columns={config.columns.length} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length}>
                    <EmptyState message={config.emptyMessage} />
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const rowId = String(row.id ?? index);
                  const expanded = expandedId === rowId;
                  return (
                    <Fragment key={rowId}>
                      <tr
                        role="button"
                        tabIndex={0}
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : rowId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedId(expanded ? null : rowId);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-soft"
                      >
                        {config.columns.map((column) => (
                          <td key={column.key} className="px-4 py-3.5 align-top">
                            {renderCell(column.key, row[column.key])}
                          </td>
                        ))}
                      </tr>
                      {expanded && (
                        <tr className="bg-soft/60">
                          <td colSpan={config.columns.length} className="px-4 py-4">
                            <RowDetail columns={config.columns} row={row} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StatusLegend />

      {/* Configure Report — Filter / Sort According To / Sorting Order */}
      <Card title="Configure Report">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section>
            <h4 className="text-small font-semibold uppercase tracking-[0.06em] text-ink">
              Filter
            </h4>
            <div className="mt-3 space-y-3">
              {config.hasDateRange && (
                <div>
                  <span className="mb-1.5 block text-small font-semibold text-ink">
                    {config.dateLabel} range
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput
                      type="date"
                      aria-label={`${config.dateLabel} from`}
                      value={draft.dateFrom}
                      onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })}
                    />
                    <TextInput
                      type="date"
                      aria-label={`${config.dateLabel} to`}
                      value={draft.dateTo}
                      onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })}
                    />
                  </div>
                </div>
              )}

              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                >
                  <option value="">All statuses</option>
                  {config.statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {config.hasVerificationStatus && (
                <Field label="Verification Status">
                  <Select
                    value={draft.verificationStatus}
                    onChange={(event) =>
                      setDraft({ ...draft, verificationStatus: event.target.value })
                    }
                  >
                    <option value="">All verification statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </Select>
                </Field>
              )}

              {config.hasCategory && (
                <Field label="Category">
                  <Select
                    value={draft.categoryId}
                    onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {config.hasRole && (
                <Field label="Role">
                  <Select
                    value={draft.role}
                    onChange={(event) => setDraft({ ...draft, role: event.target.value })}
                  >
                    <option value="">All roles</option>
                    <option value="User">User</option>
                    <option value="Officer">Officer</option>
                    <option value="Administrator">Administrator</option>
                  </Select>
                </Field>
              )}

              {config.hasUser && (
                <Field label={config.userFilterLabel}>
                  <Select
                    value={draft.userId}
                    onChange={(event) => setDraft({ ...draft, userId: event.target.value })}
                  >
                    <option value="">All users</option>
                    {userOptions.map((user) => (
                      <option key={String(user.id)} value={String(user.id)}>
                        {`${user.first_name} ${user.last_name}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {config.hasOfficer && (
                <Field label="Officer">
                  <Select
                    value={draft.officerId}
                    onChange={(event) => setDraft({ ...draft, officerId: event.target.value })}
                  >
                    <option value="">All officers</option>
                    {officerOptions.map((officer) => (
                      <option key={String(officer.id)} value={String(officer.id)}>
                        {`${officer.first_name} ${officer.last_name}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-small font-semibold uppercase tracking-[0.06em] text-ink">
              Sort According To
            </h4>
            <div className="mt-3 space-y-2.5">
              {config.sortFields.map((field) => (
                <label key={field.key} className="flex items-center gap-2.5 text-body text-ink">
                  <input
                    type="radio"
                    name="sort-by"
                    className="h-4 w-4 accent-amber"
                    checked={draft.sortBy === field.key}
                    onChange={() => setDraft({ ...draft, sortBy: field.key })}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-small font-semibold uppercase tracking-[0.06em] text-ink">
              Sorting Order
            </h4>
            <div className="mt-3 space-y-2.5">
              {[
                { value: "asc", label: "Ascending" },
                { value: "desc", label: "Descending" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2.5 text-body text-ink">
                  <input
                    type="radio"
                    name="sort-order"
                    className="h-4 w-4 accent-amber"
                    checked={draft.sortOrder === option.value}
                    onChange={() =>
                      setDraft({ ...draft, sortOrder: option.value as "asc" | "desc" })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={clearFilter}>
            Clear Filter
          </Button>
          <Button variant="primary" onClick={generate}>
            <span className="material-symbols-outlined text-[18px]">assessment</span>
            Generate Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
