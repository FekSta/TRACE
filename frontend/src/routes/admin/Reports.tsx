import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";

/**
 * Reports.
 *
 * The Module 7 issue task list calls for `GET /dashboard/reports` from the
 * Dashboard module, but this pass adds no backend endpoints (milestone
 * guardrail). The dashboard above already shows live recovery numbers;
 * the dedicated reporting surface is the Module 8 handoff.
 */
export default function Reports() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Reports</h1>
        <p className="mt-1.5 text-sm text-muted">Recovery performance and claim analytics.</p>
      </div>

      <Card title="Reporting">
        <EmptyState
          message="Dedicated reports aren't built yet."
          hint={
            <>
              The issue list specifies a backend <code>GET /dashboard/reports</code> endpoint (Dashboard module), which this
              milestone deliberately defers — the guardrail says no new backend endpoints in this pass (Review.md §Module 7).
              Live recovery numbers are available on the Dashboard page; richer analytics arrive with the Dashboard module.
            </>
          }
        />
      </Card>
    </div>
  );
}
