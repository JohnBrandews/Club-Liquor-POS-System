"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#050810]/80 text-[color:var(--accent)] backdrop-blur-xl md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r border-[color:var(--border)] bg-[#0f172a] p-4 transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div>
            <h1 className="neon-text text-xl font-bold tracking-tight text-[color:var(--primary)]">
              Club Liquor POS
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Nightlife System
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--muted)] hover:bg-white/5 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            if (item.roles && !item.roles.includes(user.role)) return null;

            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                  ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/30"
                  : "text-[color:var(--muted)] hover:bg-white/5 hover:text-[color:var(--foreground)]"
                  }`}
              >
                <span className={`transition-colors ${isActive ? "text-[color:var(--primary)]" : "group-hover:text-[color:var(--primary)]"}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <div className="mb-4 rounded-2xl bg-[#1e293b] p-4 border border-[color:var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-bold text-white">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
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
    </>
  );
}
