import { useAuthedFetch } from "../../hooks/useAuthedFetch";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import type { Notification } from "../../lib/types";

/**
 * Notifications view.
 *
 * Module 6 writes `Notification` rows and emails but exposes no read
 * endpoint (see Notes.md §12 — triggers only). Per the Module 7 guardrail
 * ("do not add backend endpoints in this pass") we document the gap here
 * rather than silently fabricate data: the list endpoint is the Module 8
 * handoff point. We still probe GET /notifications so the view lights up
 * the moment the backend grows the route.
 */
export default function Notifications() {
  const notifications = useAuthedFetch<Notification[]>("/notifications");

  if (notifications.loading) return <Loading label="Loading notifications…" />;

  // Only a 404 means the read endpoint is genuinely missing (the documented
  // Module 6 gap). Any other error is a real connectivity failure and is
  // shown as such rather than being mislabeled as the gap.
  const gap = notifications.errorStatus === 404;
  const list = notifications.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Notifications</h1>
        <p className="mt-1.5 text-sm text-muted">
          Emails for matches, claims, and collections land in your inbox (Mailpit during local dev).
        </p>
      </div>

      {notifications.errorStatus !== null && !gap ? (
        <Card title="Notification inbox">
          <EmptyState
            message={notifications.error ?? "Could not load notifications."}
            hint="Check that the backend is running and you are signed in."
          />
        </Card>
      ) : gap ? (
        <Card title="Notification inbox">
          <EmptyState
            message="This inbox isn't wired up yet."
            hint={
              <>
                Module 6 delivers notifications by <strong>email</strong> and persists a <code>Notification</code> row per
                event, but the backend exposes no <code>GET /notifications</code> endpoint yet — and this milestone adds no
                backend routes. The read surface is the explicit Module 8 handoff (flagged in Review.md §Module 7). In the
                meantime, watch <code>http://localhost:8025</code> (Mailpit) for your TRACE emails.
              </>
            }
          />
        </Card>
      ) : list.length === 0 ? (
        <Card title="Notification inbox">
          <EmptyState message="You're all caught up — no notifications yet." />
        </Card>
      ) : (
        <Card title="Notification inbox" meta={`${list.length} notification(s)`}>
          <ul className="divide-y divide-line">
            {list.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3.5">
                <span className="material-symbols-outlined mt-0.5 text-brand">notifications</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{n.message}</p>}
                  <p className="mt-1 text-[11px] text-muted">
                    {n.notification_type} · {new Date(n.created_at).toLocaleString()}
                    {n.is_read ? " · read" : " · unread"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
