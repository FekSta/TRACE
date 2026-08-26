import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
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

export default function OfficerPortal() {
  const [page, setPage] = useState("dashboard");

  return (
    <AppShell portalTitle="Lost & Found Officer" nav={NAV} active={page} onNavigate={setPage}>
      {page === "dashboard" && <OfficerDashboard />}
      {page === "verify" && <VerifyReports />}
      {page === "claims" && <ReviewClaims />}
      {page === "collections" && <Collections />}
      {page === "status" && <StatusUpdate />}
    </AppShell>
  );
}
