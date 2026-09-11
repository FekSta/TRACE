import { describe, expect, it } from "vitest";
import { REPORTS, reportToCsv } from "./reportConfig";

describe("reportConfig", () => {
  it("defines the exact column labels for every report", () => {
    expect(REPORTS.users.columns.map((c) => c.label)).toEqual([
      "First Name",
      "Last Name",
      "Student/Staff No.",
      "Email",
      "Role",
      "Status",
      "Registered",
    ]);
    expect(REPORTS.lost_items.columns.map((c) => c.label)).toEqual([
      "Item",
      "Category",
      "Reported By",
      "Date Lost",
      "Location",
      "Status",
    ]);
    expect(REPORTS.found_items.columns.map((c) => c.label)).toEqual([
      "Item",
      "Category",
      "Found By",
      "Date Found",
      "Storage Location",
      "Status",
    ]);
    expect(REPORTS.claims.columns.map((c) => c.label)).toEqual([
      "Claim ID",
      "Lost Item",
      "Found Item",
      "Claimant",
      "Officer",
      "Claim Date",
      "Verification",
      "Status",
      "Collected",
    ]);
  });

  it("exposes the sort fields with the API's machine keys", () => {
    expect(REPORTS.users.sortFields.map((f) => f.key)).toEqual([
      "registered",
      "role",
      "status",
      "last_name",
    ]);
    expect(REPORTS.lost_items.sortFields.map((f) => f.key)).toEqual([
      "date_lost",
      "status",
      "category",
      "title",
    ]);
    expect(REPORTS.found_items.sortFields.map((f) => f.key)).toEqual([
      "date_found",
      "status",
      "category",
      "title",
    ]);
    expect(REPORTS.claims.sortFields.map((f) => f.key)).toEqual([
      "claim_date",
      "verification_status",
      "status",
      "officer",
    ]);
  });

  it("gates the type-specific filters per report", () => {
    expect(REPORTS.users.hasRole).toBe(true);
    expect(REPORTS.users.hasCategory).toBe(false);
    expect(REPORTS.lost_items.hasCategory).toBe(true);
    expect(REPORTS.lost_items.hasUser).toBe(true);
    expect(REPORTS.claims.hasVerificationStatus).toBe(true);
    expect(REPORTS.claims.hasOfficer).toBe(true);
  });

  it("serialises rows to CSV using the column labels", () => {
    const csv = reportToCsv(REPORTS.users.columns, [
      {
        id: 1,
        first_name: "Ada",
        last_name: "Lovelace",
        student_number: "s1",
        email: "ada@example.com",
        role: "User",
        status: "Active",
        created_at: "2026-08-12",
      },
    ]);
    const [header, line] = csv.split("\r\n");
    expect(header).toBe(
      "First Name,Last Name,Student/Staff No.,Email,Role,Status,Registered",
    );
    expect(line).toBe("Ada,Lovelace,s1,ada@example.com,User,Active,2026-08-12");
  });

  it("quotes values containing commas or quotes", () => {
    const csv = reportToCsv([{ key: "item", label: "Item" }], [
      { item: 'Backpack, "Nike"' },
    ]);
    expect(csv.split("\r\n")[1]).toBe('"Backpack, ""Nike"""');
  });

  it("renders blank cells for null values (e.g. uncollected claims)", () => {
    const csv = reportToCsv(REPORTS.claims.columns, [
      {
        id: 1,
        lost_item: "L",
        found_item: "F",
        claimant: "Ada",
        officer: null,
        claim_date: "2026-08-12",
        verification_status: "Pending",
        status: "Active",
        collected: null,
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe("1,L,F,Ada,,2026-08-12,Pending,Active,");
  });
});
