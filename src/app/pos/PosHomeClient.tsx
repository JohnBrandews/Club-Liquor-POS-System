"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatKes } from "@/lib/money";
import { formatEAT } from "@/lib/time";

type OpenTabRow = {
  id: string;
  type: "TABLE_TAB" | "QUICK_SALE" | "NAMED_TAB";
  openedAt: string;
  label: string;
  totalCents: number;
  needsAttention: boolean;
};

type UserRole = "ADMIN" | "MANAGER" | "BARTENDER" | "WAITER";

export function PosHomeClient({ role }: { role: UserRole }) {
  const router = useRouter();
  const [tabs, setTabs] = useState<OpenTabRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [namedOpen, setNamedOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const canCreateNamed = customerName.trim().length >= 1;

  const isWaiter = role === "WAITER";

  async function startQuickSale() {
    const tabId = await createTab({ type: "QUICK_SALE" });
    router.push(`/pos/tab/${tabId}`);
  }

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function tick() {
      const res = await fetch("/api/pos/tabs/open", { cache: "no-store" }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (!mounted) return;
      if (json?.ok) setTabs(json.tabs);
      setLoading(false);
      timer = window.setTimeout(tick, 2000);
    }

    tick();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (!isWaiter && e.ctrlKey && key === "q") {
        e.preventDefault();
        startQuickSale().catch(() => null);
      }
      if (e.ctrlKey && key === "t") {
        e.preventDefault();
        router.push("/pos/floor");
      }
      if (!isWaiter && e.ctrlKey && key === "n") {
        e.preventDefault();
        setNamedOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, isWaiter]);

  const counts = useMemo(() => {
    return {
      total: tabs.length,
      attention: tabs.filter((t) => t.needsAttention).length,
    };
  }, [tabs]);

  async function createTab(input: {
    type: "TABLE_TAB" | "QUICK_SALE" | "NAMED_TAB";
    customerName?: string;
  }) {
    const res = await fetch("/api/pos/tabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.ok) throw new Error(json?.error ?? "Failed to create tab");
    return json.tabId as string;
  }

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur neon-ring">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Start an order</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Table tabs, quick walk-ins, and named tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            className="h-14 rounded-2xl border border-[color:var(--border)] bg-black/20 text-left px-4 hover:bg-black/30"
            onClick={() => router.push("/pos/floor")}
          >
            <div className="text-sm font-semibold">Table Tab</div>
            <div className="text-xs text-[color:var(--muted)]">Pick a table from floor plan</div>
          </button>

          {!isWaiter && (
            <>
              <button
                className="h-14 rounded-2xl border border-[color:var(--accent)]/60 bg-[color:var(--accent)] text-left px-4 text-black hover:brightness-110"
                onClick={() => startQuickSale()}
              >
                <div className="text-sm font-semibold">Quick Sale</div>
                <div className="text-xs/4 opacity-80">Fastest workflow</div>
              </button>

              <button
                className="h-14 rounded-2xl border border-[color:var(--border)] bg-black/20 text-left px-4 hover:bg-black/30"
                onClick={() => setNamedOpen(true)}
              >
                <div className="text-sm font-semibold">Named Tab</div>
                <div className="text-xs text-[color:var(--muted)]">Open by customer name</div>
              </button>
            </>
          )}
        </div>

        {!isWaiter && namedOpen ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">New named tab</div>
                <div className="text-xs text-[color:var(--muted)]">Example: “Kev”, “Wanjiku”</div>
              </div>
              <button
                className="h-9 rounded-xl border border-[color:var(--border)] bg-black/10 px-3 text-xs hover:bg-black/20"
                onClick={() => {
                  setNamedOpen(false);
                  setCustomerName("");
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                className="h-12 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
              <button
                className="h-12 rounded-xl bg-[color:var(--accent2)] px-5 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
                disabled={!canCreateNamed}
                onClick={async () => {
                  const tabId = await createTab({
                    type: "NAMED_TAB",
                    customerName: customerName.trim(),
                  });
                  router.push(`/pos/tab/${tabId}`);
                }}
              >
                Open tab
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Open tabs</div>
            <div className="text-xs text-[color:var(--muted)]">
              {loading ? "Loading…" : `${counts.total} open`}
              {counts.attention ? ` • ${counts.attention} attention` : ""}
            </div>
          </div>
          <button
            className="h-10 rounded-xl border border-[color:var(--border)] bg-black/20 px-4 text-xs hover:bg-black/30"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {tabs.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-black/20 p-4 text-sm text-[color:var(--muted)]">
              No open tabs.
            </div>
          ) : (
            tabs.map((t) => (
              <button
                key={t.id}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-black/20 p-4 text-left hover:bg-black/30"
                onClick={() => router.push(`/pos/tab/${t.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {t.label}{" "}
                      {t.needsAttention ? (
                        <span className="ml-2 rounded-lg bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-200">
                          Attention
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {t.type === "TABLE_TAB"
                        ? "Table Tab"
                        : t.type === "NAMED_TAB"
                          ? "Named Tab"
                          : "Quick Sale"}{" "}
                      • Opened {formatEAT(t.openedAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold">{formatKes(t.totalCents)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </main>
  );
}

