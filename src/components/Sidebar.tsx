"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/pos/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/pos",
    label: "POS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/pos/floor",
    label: "Floor Plan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M3 3h18v18H3z" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    ),
  },
  {
    href: "/pos/tab/quick", // Placeholder for quick sale logic if handled via route
    label: "Quick Sale",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    roles: ["ADMIN", "MANAGER", "BARTENDER"],
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M21 8V21H3V8" />
        <path d="M1 3h22v5H1z" />
        <path d="M10 12h4" />
      </svg>
    ),
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/staff",
    label: "Staff",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    ),
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    roles: ["ADMIN"],
  },
];

export function Sidebar({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 flex h-dvh w-64 flex-col border-r border-[color:var(--border)] bg-[#050810] p-4">
      <div className="mb-8 px-2">
        <h1 className="neon-text text-xl font-bold tracking-tight text-[color:var(--accent)]">
          Club POS
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Nightlife System
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.roles && !item.roles.includes(user.role)) return null;

          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[linear-gradient(45deg,rgba(0,212,255,0.15),rgba(124,58,237,0.1))] text-[color:var(--foreground)] ring-1 ring-[color:var(--accent)]/30"
                  : "text-[color:var(--muted)] hover:bg-white/5 hover:text-[color:var(--foreground)]"
              }`}
            >
              <span className={`transition-colors ${isActive ? "text-[color:var(--accent)]" : "group-hover:text-[color:var(--accent)]"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <div className="mb-4 rounded-2xl bg-[#0a1226] p-4 ring-1 ring-[color:var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent2)] text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted)]">
                {user.role}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-red-500/10 transition-colors hover:bg-red-500/20">
            <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
