/**
 * API entity types — mirrors of the backend response schemas
 * (one schemas.py per module under backend/app/modules/, documented in
 * Notes.md §8–12).
 */

export interface Category {
  id: number;
  category_name: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
  status: "Active" | "Archived";
  created_at: string;
}

export interface LostItem {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description: string | null;
  brand: string | null;
  colour: string | null;
  date_lost: string | null;
  location_lost: string | null;
  status: "Reported" | "Matched" | "Claimed" | "Closed";
}

export interface FoundItem {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description: string | null;
  brand: string | null;
  colour: string | null;
  date_found: string | null;
  storage_location: string | null;
  status: "Available" | "Claimed" | "Returned";
}

export interface Match {
  id: number;
  lost_item_id: number;
  found_item_id: number;
  match_score: string | number; // Decimal serialized as string by FastAPI
  match_reason: string | null;
  status: "Suggested" | "Accepted" | "Rejected";
  generated_at: string;
}

export interface Claim {
  id: number;
  lost_item_id: number;
  found_item_id: number;
  user_id: number;
  claim_date: string;
  verification_status: "Pending" | "Approved" | "Rejected";
  officer_id: number | null;
  verification_notes: string | null;
  collection_date: string | null;
  status: "Active" | "Completed" | "Cancelled";
}

export interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: number;
  uploaded_at: string;
  related_entity: "LostItem" | "FoundItem" | "Claim";
  entity_id: number | null;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string | null;
  notification_type: "Match" | "Claim" | "Reminder" | "System";
  is_read: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  entity_name: string;
  entity_id: number | null;
  timestamp: string;
  ip_address: string | null;
}

export interface ManagedUser {
  id: number;
  first_name: string;
  last_name: string;
  student_number: string | null;
  email: string;
  phone_number: string | null;
  role: "User" | "Officer" | "Administrator";
  status: "Active" | "Suspended" | "Inactive";
  created_at: string;
}

/** One row of a Dashboard report — already joined and human-readable by the
 *  backend; keys differ per report type (see `routes/admin/reportConfig.ts`). */
export type ReportRow = Record<string, string | number | null>;

/** Response envelope for `GET /dashboard/reports` (Dashboard module). */
export interface ReportResponse {
  report_type: "users" | "lost_items" | "found_items" | "claims";
  generated_at: string;
  count: number;
  rows: ReportRow[];
}
