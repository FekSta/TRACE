import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
import SearchInput from "../../components/ui/SearchInput";
import UserDashboard from "./UserDashboard";
import ReportItem from "./ReportItem";
import MyMatches from "./MyMatches";
import MyClaims from "./MyClaims";
import Notifications from "./Notifications";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "report-lost", label: "Report Lost Item", icon: "add_circle" },
  { id: "report-found", label: "Report Found Item", icon: "check_circle" },
  { id: "matches", label: "My Matches", icon: "link" },
  { id: "claims", label: "Track Claims", icon: "assignment" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
];

/** Search scopes for the student screens that list data. The report forms and
 *  the Notifications gap panel render no search control, and Track Claims
 *  renders its own search under the page heading (per `design/Track-Claim.jpeg`). */
const SEARCH: Record<string, { label: string; placeholder: string }> = {
  dashboard: { label: "Search your reports", placeholder: "Search your reports…" },
  matches: { label: "Search your matches", placeholder: "Search your matches…" },
};

export default function UserPortal() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");

  function navigate(id: string) {
    setPage(id);
    setQuery("");
  }

  const search = SEARCH[page];

  return (
    <AppShell
      portalTitle="Student Portal"
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
      {page === "dashboard" && <UserDashboard query={query} onReport={() => navigate("report-lost")} />}
      {page === "report-lost" && <ReportItem kind="lost" onDone={() => navigate("dashboard")} />}
      {page === "report-found" && <ReportItem kind="found" onDone={() => navigate("dashboard")} />}
      {page === "matches" && <MyMatches query={query} />}
      {page === "claims" && <MyClaims query={query} onQueryChange={setQuery} />}
      {page === "notifications" && <Notifications />}
    </AppShell>
  );
}
