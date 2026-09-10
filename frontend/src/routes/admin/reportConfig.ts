/**
 * Admin Reports configuration — one shared screen, parameterised by report
 * type (Review.md "Admin Reports page"). Columns, filters and sort fields are
 * sourced exactly from the per-report tables in the task spec / Notes.md §15;
 * no field is invented that is absent from the entity model.
 *
 * The API contract these feed:
 *   GET /dashboard/reports?type=...&date_from=...&sort_by=...&sort_order=...
 */

import type { ReportRow } from "../../lib/types";

export type ReportTypeId = "users" | "lost_items" | "found_items" | "claims";

export interface ReportColumn {
  /** Row field key returned by the API. */
  key: string;
  /** Column header — plain English, exactly as specified (never a raw field name). */
  label: string;
}

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportSortField {
  /** Value sent as `?sort_by=`. */
  key: string;
  label: string;
}

export interface ReportConfig {
  id: ReportTypeId;
  /** Page title, e.g. "Lost Items Report". */
  title: string;
  columns: ReportColumn[];
  /** Options for the Status filter. */
  statuses: ReportFilterOption[];
  /** Which type-specific filter controls this report shows. */
  hasDateRange: boolean;
  hasCategory: boolean;
  hasRole: boolean;
  hasUser: boolean;
  hasOfficer: boolean;
  hasVerificationStatus: boolean;
  /** Label for the user picker ("Reported By" / "Found By"). */
  userFilterLabel: string;
  /** Human name of the report's date field, used in the range labels. */
  dateLabel: string;
  sortFields: ReportSortField[];
  /** Sort field pre-selected when the report loads. */
  defaultSortBy: string;
  /** Plain-language empty-state message. */
  emptyMessage: string;
}

const options = (values: string[]): ReportFilterOption[] =>
  values.map((value) => ({ value, label: value }));

export const REPORTS: Record<ReportTypeId, ReportConfig> = {
  users: {
    id: "users",
    title: "Users Report",
    columns: [
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "student_number", label: "Student/Staff No." },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Registered" },
    ],
    statuses: options(["Active", "Suspended", "Inactive"]),
    hasDateRange: true,
    hasCategory: false,
    hasRole: true,
    hasUser: false,
    hasOfficer: false,
    hasVerificationStatus: false,
    userFilterLabel: "",
    dateLabel: "Registered",
    sortFields: [
      { key: "registered", label: "Registered Date" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "last_name", label: "Last Name" },
    ],
    defaultSortBy: "registered",
    emptyMessage: "No users found for these filters.",
  },
  lost_items: {
    id: "lost_items",
    title: "Lost Items Report",
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "reported_by", label: "Reported By" },
      { key: "date_lost", label: "Date Lost" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
    ],
    statuses: options(["Reported", "Matched", "Claimed", "Closed"]),
    hasDateRange: true,
    hasCategory: true,
    hasRole: false,
    hasUser: true,
    hasOfficer: false,
    hasVerificationStatus: false,
    userFilterLabel: "Reported By",
    dateLabel: "Date Lost",
    sortFields: [
      { key: "date_lost", label: "Date Lost" },
      { key: "status", label: "Status" },
      { key: "category", label: "Category" },
      { key: "title", label: "Item Title" },
    ],
    defaultSortBy: "date_lost",
    emptyMessage: "No lost items found for this date range.",
  },
  found_items: {
    id: "found_items",
    title: "Found Items Report",
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "found_by", label: "Found By" },
      { key: "date_found", label: "Date Found" },
      { key: "storage_location", label: "Storage Location" },
      { key: "status", label: "Status" },
    ],
    statuses: options(["Available", "Claimed", "Returned"]),
    hasDateRange: true,
    hasCategory: true,
    hasRole: false,
    hasUser: true,
    hasOfficer: false,
    hasVerificationStatus: false,
    userFilterLabel: "Found By",
    dateLabel: "Date Found",
    sortFields: [
      { key: "date_found", label: "Date Found" },
      { key: "status", label: "Status" },
      { key: "category", label: "Category" },
      { key: "title", label: "Item Title" },
    ],
    defaultSortBy: "date_found",
    emptyMessage: "No found items found for this date range.",
  },
  claims: {
    id: "claims",
    title: "Claims Report",
    columns: [
      { key: "id", label: "Claim ID" },
      { key: "lost_item", label: "Lost Item" },
      { key: "found_item", label: "Found Item" },
      { key: "claimant", label: "Claimant" },
      { key: "officer", label: "Officer" },
      { key: "claim_date", label: "Claim Date" },
      { key: "verification_status", label: "Verification" },
      { key: "status", label: "Status" },
      { key: "collected", label: "Collected" },
    ],
    statuses: options(["Active", "Completed", "Cancelled"]),
    hasDateRange: true,
    hasCategory: false,
    hasRole: false,
    hasUser: false,
    hasOfficer: true,
    hasVerificationStatus: true,
    userFilterLabel: "",
    dateLabel: "Claim Date",
    sortFields: [
      { key: "claim_date", label: "Claim Date" },
      { key: "verification_status", label: "Verification Status" },
      { key: "status", label: "Status" },
      { key: "officer", label: "Officer" },
    ],
    defaultSortBy: "claim_date",
    emptyMessage: "No claims found for this date range.",
  },
};

export const REPORT_TYPE_OPTIONS: { value: ReportTypeId; label: string }[] = [
  { value: "users", label: "Users" },
  { value: "lost_items", label: "Lost Items" },
  { value: "found_items", label: "Found Items" },
  { value: "claims", label: "Claims" },
];

/** Humanise a row key that has no column label (used by the expanded row). */
export function humaniseKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Serialise the visible grid to CSV — header row uses the exact column labels,
 * values are already `YYYY-MM-DD` / human enum labels (no reformatting needed).
 */
export function reportToCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((column) => escape(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escape(row[column.key])).join(","),
  );
  return [header, ...lines].join("\r\n");
}
