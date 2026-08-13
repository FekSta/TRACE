import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import type { AuditLogEntry } from "../../lib/types";

/**
 * AuditLog viewer.
 *
 * Every mutating step writes an `AuditLog` row (Modules 3–6) but no
 * read endpoint exists yet, and this pass adds no backend routes. We probe
 * GET /audit-logs so the view lights up when the Dashboard module ships
 * the route (Module 8 handoff — Review.md §Module 7).
 */
export default function AuditLog() {
  const audit = useAuthedFetch<AuditLogEntry[]>("/audit-logs");

  if (audit.loading) return <Loading label="Loading audit log…" />;

  // Only a 404 means the read endpoint is genuinely missing (Module 8
  // handoff); any other error is a real connectivity failure.
  const gap = audit.errorStatus === 404;
  const entries = audit.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Audit Log</h1>
        <p className="mt-1.5 text-sm text-muted">Every mutating action across the platform, as recorded by the AuditLog entity.</p>
      </div>

      {audit.errorStatus !== null && !gap ? (
        <Card title="Audit trail">
          <EmptyState
            message={audit.error ?? "Could not load the audit log."}
            hint="Check that the backend is running and you are signed in."
          />
        </Card>
      ) : gap ? (
        <Card title="Audit trail">
          <EmptyState
            message="The audit log viewer isn't wired up yet."
            hint={
              <>
                The backend writes an <code>AuditLog</code> row on every mutation (claim creation, verify, collect, …) but
                exposes no <code>GET /audit-logs</code> endpoint yet — and this milestone adds no backend routes. The read
                surface is the Module 8 handoff, flagged in Review.md §Module 7.
              </>
            }
          />
        </Card>
      ) : entries.length === 0 ? (
        <Card title="Audit trail">
          <EmptyState message="No audit entries recorded." />
        </Card>
      ) : (
        <Card title="Audit trail" meta={`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`} noPadding>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {entries.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">{e.action}</td>
                    <td className="px-4 py-3.5">
                      {e.entity_name} #{e.entity_id ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted">user #{e.user_id ?? "system"}</td>
                    <td className="px-4 py-3.5 text-muted">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-muted">{e.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
