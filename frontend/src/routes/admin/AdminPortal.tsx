import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
import SearchInput from "../../components/ui/SearchInput";
import AdminDashboard from "./AdminDashboard";
import Categories from "./Categories";
import Reports from "./Reports";
import AuditLog from "./AuditLog";
import Users from "./Users";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "categories", label: "Manage Categories", icon: "category" },
  { id: "users", label: "Manage Users", icon: "group" },
  { id: "reports", label: "Reports", icon: "assessment" },
  { id: "audit", label: "Audit Log", icon: "history" },
];

/** One search scope per admin screen. The Audit Log has no data source yet
 *  (documented gap), so it renders no search control rather than a dead one. */
const SEARCH: Record<string, { label: string; placeholder: string }> = {
  dashboard: { label: "Search platform claims", placeholder: "Search claims or claimants…" },
  categories: { label: "Search categories", placeholder: "Search categories…" },
  users: { label: "Search accounts", placeholder: "Search name, email, or number…" },
  reports: { label: "Search the active report results", placeholder: "Search within results…" },
};

export default function AdminPortal() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");

  function navigate(id: string) {
    setPage(id);
    setQuery("");
  }

  const search = SEARCH[page];

  return (
    <AppShell
      portalTitle="Administration"
      nav={NAV}
      active={page}
      onNavigate={navigate}
      search={
        search ? (
          <SearchInput
            value={query}
            onChange={setQuery}
            ariaLabel={search.label}
            placeholder={search.placeholder}
          />
        ) : undefined
      }
    >
      {page === "dashboard" && <AdminDashboard query={query} />}
      {page === "categories" && <Categories query={query} />}
      {page === "users" && <Users query={query} />}
      {page === "reports" && <Reports query={query} />}
      {page === "audit" && <AuditLog />}
    </AppShell>
  );
}
