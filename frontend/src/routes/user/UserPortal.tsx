import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
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

export default function UserPortal() {
  const [page, setPage] = useState("dashboard");

  return (
    <AppShell portalTitle="Student Portal" nav={NAV} active={page} onNavigate={setPage}>
      {page === "dashboard" && <UserDashboard onReport={() => setPage("report-lost")} />}
      {page === "report-lost" && <ReportItem kind="lost" onDone={() => setPage("dashboard")} />}
      {page === "report-found" && <ReportItem kind="found" onDone={() => setPage("dashboard")} />}
      {page === "matches" && <MyMatches />}
      {page === "claims" && <MyClaims />}
      {page === "notifications" && <Notifications />}
    </AppShell>
  );
}
