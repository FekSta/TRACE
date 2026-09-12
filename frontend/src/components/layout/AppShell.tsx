import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface Props {
  portalTitle: string; // e.g. "Lost & Found Officer"
  nav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  /** optional widget next to the page title, e.g. a search box */
  search?: ReactNode;
}

/**
 * Shared shell — sidebar + topbar + content, one instance per portal.
 * Navigation follows TRACE Design System §13: white surface, muted inactive
 * labels, outline icons, ink pill for the active destination, and the soft
 * blue `nav-hover` fill on hover.
 */
export default function AppShell({ portalTitle, nav, active, onNavigate, children, search }: Props) {
  const { session, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const firstName = session?.payload?.FirstName?.trim() ?? "";
  const lastName = session?.payload?.LastName?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || session?.payload?.Role || "Guest";
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || session?.payload?.Role?.slice(0, 2).toUpperCase() || "TR";

  function navigate(id: string) {
    onNavigate(id);
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-line bg-surface px-4 pb-5 pt-7 transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center gap-2.5 px-2.5">
          <span className="material-symbols-outlined text-[32px] text-ink">radar</span>
          <div>
            <h1 className="font-display text-h2 leading-none tracking-tight text-ink">TRACE</h1>
            <p className="mt-1 text-small uppercase tracking-[0.08em] text-muted">{portalTitle}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={active === item.id ? "page" : undefined}
              className={`flex items-center gap-3 rounded-full px-3.5 py-3 text-left text-body font-semibold transition-colors duration-150 ${
                active === item.id ? "bg-ink text-white" : "text-muted hover:bg-nav-hover hover:text-ink"
              }`}
            >
              <span className="material-symbols-outlined text-[21px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-soft text-small font-bold text-ink">
              {initials}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-body text-ink">{fullName}</strong>
              <span className="block text-small text-muted">{session?.payload?.Role ?? "Guest"}</span>
            </div>
          </div>
          <div className="mt-3.5 flex gap-1.5">
            <button
              onClick={logout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-input px-2 py-2 text-small text-muted hover:bg-soft hover:text-ink"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="min-h-screen lg:ml-[260px]">
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="Open navigation"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-input text-muted hover:bg-soft hover:text-ink lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
            <span className="block text-small font-bold uppercase tracking-[0.12em] text-amber">TRACE</span>
            <h2 className="mt-0.5 truncate font-display text-h2 text-ink">
              {nav.find((n) => n.id === active)?.label ?? "Dashboard"}
            </h2>
            </div>
          </div>
          {search && <div className="hidden md:block">{search}</div>}
          <div className="flex items-center gap-1.5">
            <button
              className="grid h-[38px] w-[38px] place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="ml-1 grid h-[34px] w-[34px] place-items-center rounded-full bg-soft text-small font-bold text-ink">
              {initials}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
