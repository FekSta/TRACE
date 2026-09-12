/**
 * Client-side row filtering for the portal dashboards.
 *
 * TRACE's list endpoints have no server-side search (`/items/lost`,
 * `/items/found` take no query parameters at all), so every dashboard search
 * and filter tab narrows the array the page has *already* fetched. That is
 * deliberate: the API's own scoping (Users see only their own rows, staff see
 * all) stays the single source of truth, so a page can never surface a row
 * the caller was not already allowed to fetch.
 *
 * Pure functions, kept out of React so the scoping guarantee is unit-testable.
 */

export type FilterField = string | number | null | undefined;

/** Case-insensitive, whitespace-trimmed substring match across fields.
 *  A missing/empty query matches everything (a page with no search is a
 *  no-op filter, never a crash). */
export function matchesQuery(query: string | undefined, fields: FilterField[]): boolean {
  const needle = (query ?? "").trim().toLowerCase();
  if (needle === "") return true;
  return fields.some(
    (field) => field !== null && field !== undefined && String(field).toLowerCase().includes(needle),
  );
}

/** Filter `rows` by `query` over the fields the caller explicitly exposes. */
export function filterRows<T>(
  rows: T[],
  query: string | undefined,
  fieldsOf: (row: T) => FilterField[],
): T[] {
  if ((query ?? "").trim() === "") return rows;
  return rows.filter((row) => matchesQuery(query, fieldsOf(row)));
}

/** Count rows per tab id — used for the counts shown inside `FilterTabs`. */
export function countByTab<T>(rows: T[], tabOf: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const id = tabOf(row);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
