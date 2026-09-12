import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
import SearchInput from "../../components/ui/SearchInput";
import OfficerDashboard from "./OfficerDashboard";
import VerifyReports from "./VerifyReports";
import ReviewClaims from "./ReviewClaims";
import Collections from "./Collections";
import StatusUpdate from "./StatusUpdate";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "verify", label: "Verify Reports", icon: "fact_check" },
  { id: "claims", label: "Review Claims", icon: "assignment_turned_in" },
  { id: "collections", label: "Approve Collections", icon: "how_to_reg" },
  { id: "status", label: "Update Item Status", icon: "sync_alt" },
];

/** One search scope per officer screen — the query only ever filters the
 *  rows that screen already fetched (see `lib/filterRows.ts`). */
const SEARCH: Record<string, { label: string; placeholder: string }> = {
  dashboard: { label: "Search reported items and claims", placeholder: "Search reports, claims, or item IDs…" },
  verify: { label: "Search reports awaiting verification", placeholder: "Search reports or item IDs…" },
  claims: { label: "Search claims to review", placeholder: "Search claims or item IDs…" },
  collections: { label: "Search collections ready for pickup", placeholder: "Search collections, owners, or item IDs…" },
  status: { label: "Search items by status", placeholder: "Search items or IDs…" },
};

export default function OfficerPortal() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");

  function navigate(id: string) {
    setPage(id);
    setQuery("");
  }

  const search = SEARCH[page] ?? SEARCH.dashboard;

  return (
    <AppShell
      portalTitle="Lost & Found Officer"
      nav={NAV}
      active={page}
      onNavigate={navigate}
      search={
        <SearchInput
          value={query}
          onChange={setQuery}
          ariaLabel={search.label}
          placeholder={search.placeholder}
        />
      }
    >
      {page === "dashboard" && <OfficerDashboard query={query} onNavigate={navigate} />}
      {page === "verify" && <VerifyReports query={query} />}
      {page === "claims" && <ReviewClaims query={query} />}
      {page === "collections" && <Collections query={query} />}
      {page === "status" && <StatusUpdate query={query} />}
    </AppShell>
  );
}
