"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatKes } from "@/lib/money";
import { formatEAT } from "@/lib/time";

type FloorTable = {
  id: string;
  label: string;
  section: "MAIN_FLOOR" | "VIP" | "BAR_COUNTER";
  status: "EMPTY" | "OCCUPIED" | "ATTENTION";
  openedAt: string | null;
  assignedWaiter: { id: string; name: string } | null;
  currentTabId: string | null;
  totalCents: number;
  needsAttention: boolean;
};

type UserRole = "ADMIN" | "MANAGER" | "BARTENDER" | "WAITER";

type Me = {
  id: string;
  name: string;
  role: UserRole;
} | null;

function sectionTitle(section: FloorTable["section"]) {
  if (section === "MAIN_FLOOR") return "Main Floor";
  if (section === "VIP") return "VIP Section";
  return "Bar Counter";
}

export default function FloorPlanPage() {
  const router = useRouter();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function tick() {
      const res = await fetch("/api/pos/floorplan", { cache: "no-store" }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (!mounted) return;
      if (json?.ok) setTables(json.tables);
      timer = window.setTimeout(tick, 2000);
    }
    tick();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j?.user ?? null))
      .catch(() => null);
  }, []);

  const visibleTables = useMemo(() => {
    if (!me || me.role !== "WAITER") return tables;
    return tables.filter((t) => t.assignedWaiter && t.assignedWaiter.id === me.id);
  }, [tables, me]);

  const bySection = useMemo(() => {
    const m: Record<FloorTable["section"], FloorTable[]> = {
      MAIN_FLOOR: [],
      VIP: [],
      BAR_COUNTER: [],
    };
    for (const t of visibleTables) m[t.section].push(t);
    return m;
  }, [visibleTables]);

  async function openOrCreateTableTab(table: FloorTable) {
    if (table.currentTabId) {
      router.push(`/pos/tab/${table.currentTabId}`);
      return;
    }
    const res = await fetch("/api/pos/tabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "TABLE_TAB", tableId: table.id }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.ok) return;
    router.push(`/pos/tab/${json.tabId}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm tracking-widest text-[color:var(--muted)]">FLOOR PLAN</div>
          <h1 className="text-lg font-semibold">Tables</h1>
        </div>
        <button
          className="h-10 rounded-xl border border-[color:var(--border)] bg-black/20 px-4 text-sm hover:bg-black/30"
          onClick={() => router.push("/pos")}
        >
          Back
        </button>
      </div>

      {me && me.role === "WAITER" && visibleTables.length === 0 ? (
        <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-black/20 p-4 text-sm text-[color:var(--muted)]">
          No tables are currently assigned to you. Please check with your manager or admin.
        </div>
      ) : null}

      {(["MAIN_FLOOR", "VIP", "BAR_COUNTER"] as const).map((section) => (
        <section key={section} className="mb-6">
          <div className="mb-2 text-sm font-semibold">{sectionTitle(section)}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {bySection[section].map((t) => {
              const statusColor = t.needsAttention
                ? "border-yellow-500/40 bg-yellow-500/10"
                : t.currentTabId
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10";

              return (
                <button
                  key={t.id}
                  className={`min-h-[96px] rounded-2xl border p-3 text-left hover:brightness-110 ${statusColor}`}
                  onClick={() => openOrCreateTableTab(t)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {t.needsAttention ? "ATTN" : t.currentTabId ? "OCC" : "EMPTY"}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[color:var(--muted)]">
                    {t.currentTabId ? formatKes(t.totalCents) : "—"}
                  </div>
                  {t.openedAt ? (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      Opened {formatEAT(t.openedAt)}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {t.assignedWaiter ? `Waiter: ${t.assignedWaiter.name}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

