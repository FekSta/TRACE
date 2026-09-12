import { describe, expect, it } from "vitest";
import { countByTab, filterRows, matchesQuery } from "./filterRows";

describe("matchesQuery", () => {
  it("matches everything for an empty or whitespace-only query", () => {
    expect(matchesQuery("", ["Wallet"])).toBe(true);
    expect(matchesQuery("   ", ["Wallet"])).toBe(true);
  });

  it("treats a missing query as no filter", () => {
    expect(matchesQuery(undefined, ["Wallet"])).toBe(true);
    expect(filterRows([1, 2], undefined, (row) => [row])).toEqual([1, 2]);
  });

  it("is case-insensitive and substring-based", () => {
    expect(matchesQuery("WALL", ["Black Leather Wallet"])).toBe(true);
    expect(matchesQuery("wallet", ["Black Leather", 12])).toBe(false);
  });

  it("ignores null and undefined fields", () => {
    expect(matchesQuery("umbrella", [null, undefined, "Blue Umbrella"])).toBe(true);
    expect(matchesQuery("umbrella", [null, undefined])).toBe(false);
  });
});

describe("filterRows", () => {
  const rows = [
    { id: 1, title: "Black Backpack", status: "Reported" },
    { id: 2, title: "Silver Watch", status: "Matched" },
    { id: 3, title: "Blue Umbrella", status: "Reported" },
  ];

  it("returns the same rows for an empty query", () => {
    expect(filterRows(rows, "", (row) => [row.title])).toBe(rows);
  });

  it("narrows rows by the fields the caller exposes", () => {
    expect(filterRows(rows, "silver", (row) => [row.title, row.id]).map((row) => row.id)).toEqual([2]);
  });

  it("never returns a row that was not in the input set", () => {
    // The scoping guarantee: search can only ever narrow what the API already
    // returned for this page, so it cannot surface another user's row.
    const filtered = filterRows(rows, "backpack", (row) => [row.title]);
    expect(filtered).toHaveLength(1);
    expect(rows).toContain(filtered[0]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRows(rows, "laptop", (row) => [row.title])).toEqual([]);
  });
});

describe("countByTab", () => {
  it("counts rows per tab id", () => {
    const rows = [{ status: "Reported" }, { status: "Matched" }, { status: "Reported" }];
    expect(countByTab(rows, (row) => row.status)).toEqual({ Reported: 2, Matched: 1 });
  });

  it("returns an empty record for no rows", () => {
    expect(countByTab([], () => "all")).toEqual({});
  });
});
