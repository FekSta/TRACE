import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import type { LostItem, FoundItem, Claim, Match, Category } from "../../lib/types";

/**
 * Admin dashboard summary.
 *
 * The Module 7 issue list asks for `GET /dashboard/summary` and
 * `GET /dashboard/reports` (Dashboard module), but the milestone guardrail
 * prohibits new backend endpoints this pass. The summary is therefore
 * computed client-side from the existing list endpoints; the dedicated
 * Dashboard module endpoints remain the Module 8 handoff (Review.md §7).
 */
export default function AdminDashboard() {
  const lost = useAuthedFetch<LostItem[]>("/items/lost");
  const found = useAuthedFetch<FoundItem[]>("/items/found");
  const claims = useAuthedFetch<Claim[]>("/claims");
  const matches = useAuthedFetch<Match[]>("/matches");
  const categories = useAuthedFetch<Category[]>("/categories");

  if (lost.loading || found.loading || claims.loading) return <Loading label="Loading summary…" />;

  const lostItems = lost.data ?? [];
  const foundItems = found.data ?? [];
  const allClaims = claims.data ?? [];
  const allMatches = matches.data ?? [];
  const cats = categories.data ?? [];

  const openClaims = allClaims.filter((c) => c.status === "Active").length;
  const suggestedMatches = allMatches.filter((m) => m.status === "Suggested").length;
  const recovered = foundItems.filter((f) => f.status === "Returned").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Admin Dashboard</h1>
        <p className="mt-1.5 text-sm text-muted">
          Platform summary — computed live from the existing API endpoints.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Lost Items" value={lostItems.length} />
        <StatCard label="Found Items" value={foundItems.length} meta={`${recovered} returned`} />
        <StatCard label="Open Claims" value={openClaims} meta={`${allClaims.length} total`} />
        <StatCard label="Suggested Matches" value={suggestedMatches} />
        <StatCard label="Categories" value={cats.length} />
      </div>

      <Card title="Claims overview" meta={`${allClaims.length} claim(s)`} noPadding>
        {allClaims.length === 0 ? (
          <EmptyState message="No claims yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-soft text-[10px] uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Claimant</th>
                  <th className="px-4 py-3">Pairing</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {allClaims.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#fafdfb]">
                    <td className="px-4 py-3.5 font-semibold text-ink">#{c.id}</td>
                    <td className="px-4 py-3.5">user #{c.user_id}</td>
                    <td className="px-4 py-3.5">
                      L#<strong>{c.lost_item_id}</strong> ↔ F#<strong>{c.found_item_id}</strong>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.verification_status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted">{new Date(c.claim_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
