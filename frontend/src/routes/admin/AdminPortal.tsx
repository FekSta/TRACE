import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
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

export default function AdminPortal() {
  const [page, setPage] = useState("dashboard");

  return (
    <AppShell portalTitle="Administration" nav={NAV} active={page} onNavigate={setPage}>
      {page === "dashboard" && <AdminDashboard />}
      {page === "categories" && <Categories />}
      {page === "users" && <Users />}
      {page === "reports" && <Reports />}
      {page === "audit" && <AuditLog />}
    </AppShell>
  );
}
