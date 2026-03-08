"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatKes } from "@/lib/money";
import { formatEAT } from "@/lib/time";

type UserRole = "ADMIN" | "MANAGER" | "BARTENDER" | "WAITER";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  is86d: boolean;
  isPopular: boolean;
};

type Category = {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
};

type OrderItem = {
  id: string;
  qty: number;
  unitPriceCents: number;
  totalPriceCents: number;
  addedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  product: Product;
  addedBy: { id: string; name: string; role: UserRole };
  voidedBy?: { id: string; name: string; role: UserRole } | null;
  _optimistic?: boolean;
};

type TabDto = {
  id: string;
  type: "TABLE_TAB" | "QUICK_SALE" | "NAMED_TAB";
  status: "OPEN" | "CLOSED" | "VOIDED";
  tableId: string | null;
  customerName: string | null;
  openedAt: string;
  serviceChargeEnabled: boolean;
  serviceChargeRateBps: number;
  vatRateBps: number;
  table?: { id: string; label: string } | null;
  orderItems: OrderItem[];
};

type TotalsDto = {
  subtotalCents: number;
  serviceChargeCents: number;
  vatCents: number;
  totalCents: number;
};

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

export function TabScreen({ tabId }: { tabId: string }) {
  const router = useRouter();

  const [me, setMe] = useState<{ role: UserRole } | null>(null);
  const [tab, setTab] = useState<TabDto | null>(null);
  const [totals, setTotals] = useState<TotalsDto | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [payMethod, setPayMethod] = useState<"CASH" | "MPESA" | "SPLIT">("CASH");
  const [cashReceivedKes, setCashReceivedKes] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaRef, setMpesaRef] = useState("");
  const [mpesaAmountKes, setMpesaAmountKes] = useState("");
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);
  const canOverrideServiceCharge = me?.role === "ADMIN" || me?.role === "MANAGER";
  const canPay = me && me.role !== "WAITER";

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j?.user ?? null))
      .catch(() => null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function tick() {
      try {
        const json = await fetchJson(`/api/pos/tabs/${tabId}`, { cache: "no-store" });
        if (!mounted) return;
        setTab(json.tab);
        setTotals(json.totals);
        setServiceChargeEnabled(json.tab.serviceChargeEnabled);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
        timer = window.setTimeout(tick, 2000);
      }
    }

    tick();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [tabId]);

  useEffect(() => {
    fetchJson("/api/pos/menu", { cache: "force-cache" })
      .then((j) => {
        setCategories(j.categories ?? []);
        setActiveCategoryId((j.categories?.[0]?.id as string) ?? null);
      })
      .catch(() => null);
  }, []);

  const tabLabel = useMemo(() => {
    if (!tab) return "Tab";
    return tab.table?.label ?? tab.customerName ?? "Quick Sale";
  }, [tab]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );

  const payableCents = totals?.totalCents ?? 0;

  async function addItem(product: Product) {
    if (!tab || tab.status !== "OPEN") return;
    const optimisticId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const optimisticItem: OrderItem = {
      id: optimisticId,
      qty: 1,
      unitPriceCents: product.priceCents,
      totalPriceCents: product.priceCents,
      addedAt: new Date().toISOString(),
      voidedAt: null,
      voidReason: null,
      product,
      addedBy: { id: "me", name: "You", role: me?.role ?? "BARTENDER" },
      _optimistic: true,
    };

    setTab((prev) =>
      prev
        ? { ...prev, orderItems: [...prev.orderItems, optimisticItem] }
        : prev,
    );

    try {
      const json = await fetchJson(`/api/pos/tabs/${tab.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, qty: 1 }),
      });
      const created: OrderItem = json.item;
      setTab((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orderItems: prev.orderItems.map((it) => (it.id === optimisticId ? created : it)),
        };
      });
    } catch {
      setTab((prev) => {
        if (!prev) return prev;
        return { ...prev, orderItems: prev.orderItems.filter((it) => it.id !== optimisticId) };
      });
    }
  }

  async function updateQty(item: OrderItem, newQty: number) {
    if (!tab || tab.status !== "OPEN" || newQty < 1 || item._optimistic) return;

    // Optimistic update
    setTab((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orderItems: prev.orderItems.map((it) =>
          it.id === item.id ? { ...it, qty: newQty, totalPriceCents: it.unitPriceCents * newQty } : it,
        ),
      };
    });

    try {
      await fetchJson(`/api/pos/order-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty: newQty }),
      });
    } catch {
      // Revert on error (could be more sophisticated, but simple for now)
      router.refresh();
    }
  }

  async function removeItem(item: OrderItem) {
    if (!tab || tab.status !== "OPEN" || item._optimistic) return;
    if (!window.confirm(`Remove ${item.product.name}?`)) return;

    // Optimistic update
    setTab((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orderItems: prev.orderItems.filter((it) => it.id !== item.id),
      };
    });

    try {
      await fetchJson(`/api/pos/order-items/${item.id}`, { method: "DELETE" });
    } catch {
      router.refresh();
    }
  }

  async function voidItem(item: OrderItem) {
    if (!tab || tab.status !== "OPEN") return;
    const reason = window.prompt("Void reason (required):");
    if (!reason || reason.trim().length < 3) return;

    await fetchJson(`/api/pos/order-items/${item.id}/void`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  }

  function parseKesToCents(input: string) {
    const clean = input.replace(/[^0-9]/g, "");
    if (!clean) return 0;
    const kes = Number(clean);
    if (!Number.isFinite(kes)) return 0;
    return kes * 100;
  }

  async function pay() {
    if (!tab || tab.status !== "OPEN") return;
    const payload: Record<string, unknown> = {
      method: payMethod,
    };

    if (payMethod === "CASH") {
      payload.cashReceivedCents = parseKesToCents(cashReceivedKes);
    } else if (payMethod === "MPESA") {
      payload.mpesaPhone = mpesaPhone.trim();
      payload.mpesaRef = mpesaRef.trim() || undefined;
    } else {
      payload.mpesaPhone = mpesaPhone.trim();
      payload.mpesaRef = mpesaRef.trim() || undefined;
      payload.mpesaAmountCents = parseKesToCents(mpesaAmountKes);
      payload.cashReceivedCents = parseKesToCents(cashReceivedKes);
    }

    if (canOverrideServiceCharge) {
      payload.serviceChargeEnabled = serviceChargeEnabled;
    }

    await fetchJson(`/api/pos/tabs/${tab.id}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    router.replace("/pos");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-widest text-[color:var(--muted)] uppercase">TAB OVERVIEW</div>
          <h1 className="truncate text-2xl font-black text-white mt-1">{tabLabel}</h1>
          {tab?.openedAt ? (
            <div className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-tighter mt-1">
              Opened {formatEAT(tab.openedAt)}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="h-10 rounded-xl border border-[color:var(--border)] bg-black/20 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black/30 transition-all"
            onClick={() => router.push("/pos")}
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-[color:var(--border)] bg-[#0a1226]/40 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/90">Current Items</h2>
            <div className="text-[10px] font-bold text-[color:var(--muted)] uppercase">{loading ? "Syncing..." : "Live"}</div>
          </div>

          <div className="space-y-3">
            {tab?.orderItems?.length ? (
              tab.orderItems.map((it) => (
                <div
                  key={it.id}
                  className={`group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-black/40 p-4 transition-all hover:bg-black/60 ${it.voidedAt ? "opacity-50 grayscale" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate text-base font-bold text-white group-hover:text-[color:var(--accent)] transition-colors">
                          {it.product.name}
                        </div>
                        <button
                          className="text-[color:var(--muted)] hover:text-red-400 p-1 transition-colors"
                          onClick={() => it.voidedAt ? voidItem(it) : removeItem(it)}
                          title={it.voidedAt ? "Voided" : "Remove item"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                      </div>
                      <div className="text-[10px] font-bold text-[color:var(--accent)] uppercase tracking-tight mt-0.5">
                        {formatKes(it.unitPriceCents)} each
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
                          <button
                            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-30"
                            onClick={() => updateQty(it, it.qty - 1)}
                            disabled={it.qty <= 1 || it.voidedAt}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-white">{it.qty}</span>
                          <button
                            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-30"
                            onClick={() => updateQty(it, it.qty + 1)}
                            disabled={it.voidedAt}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          </button>
                        </div>
                        <div className="text-xl font-black text-white">
                          {formatKes(it.totalPriceCents)}
                        </div>
                      </div>

                      {it.voidedAt && (
                        <div className="mt-2 text-[10px] font-bold text-red-400 uppercase bg-red-400/10 px-2 py-1 rounded-lg inline-block">
                          VOIDED: {it.voidReason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-[color:var(--border)] bg-black/20">
                <div className="text-white/20 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                </div>
                <div className="text-sm font-bold text-[color:var(--muted)] uppercase tracking-widest">No items added yet</div>
                <div className="text-xs text-white/40 mt-1">Tap products in the menu to build this tab.</div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
            <div className="mb-3 text-sm font-semibold">Totals</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[color:var(--muted)]">
                <span>Subtotal</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(totals?.subtotalCents ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[color:var(--muted)]">
                <span>Service (10%)</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(totals?.serviceChargeCents ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[color:var(--muted)]">
                <span>VAT (16%)</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(totals?.vatCents ?? 0)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border)] pt-2">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-semibold">{formatKes(payableCents)}</span>
              </div>

              {canOverrideServiceCharge ? (
                <label className="mt-2 flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-black/20 px-3 py-2 text-xs">
                  <span className="text-[color:var(--muted)]">Service charge</span>
                  <input
                    type="checkbox"
                    checked={serviceChargeEnabled}
                    onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                  />
                </label>
              ) : null}
            </div>
          </section>

          {canPay ? (
            <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
              <div className="mb-3 text-sm font-semibold">Payment</div>

              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "MPESA", "SPLIT"] as const).map((m) => (
                  <button
                    key={m}
                    className={`h-11 rounded-xl border px-3 text-xs font-semibold ${payMethod === m
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-black"
                      : "border-[color:var(--border)] bg-black/20 hover:bg-black/30"
                      }`}
                    onClick={() => setPayMethod(m)}
                  >
                    {m === "MPESA" ? "M-Pesa" : m}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {payMethod !== "CASH" ? (
                  <input
                    className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="M-Pesa phone (e.g. 07xx...)"
                  />
                ) : null}

                {payMethod === "SPLIT" ? (
                  <input
                    className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
                    value={mpesaAmountKes}
                    onChange={(e) => setMpesaAmountKes(e.target.value)}
                    placeholder="M-Pesa amount (KES)"
                    inputMode="numeric"
                  />
                ) : null}

                {payMethod !== "MPESA" ? (
                  <input
                    className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
                    value={cashReceivedKes}
                    onChange={(e) => setCashReceivedKes(e.target.value)}
                    placeholder="Cash received (KES)"
                    inputMode="numeric"
                  />
                ) : null}

                {payMethod !== "CASH" ? (
                  <input
                    className="h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value)}
                    placeholder="M-Pesa ref (optional)"
                  />
                ) : null}

                <button
                  className="h-12 w-full rounded-xl bg-[color:var(--accent2)] text-sm font-semibold hover:brightness-110 disabled:opacity-50"
                  disabled={!tab || tab.status !== "OPEN" || payableCents <= 0}
                  onClick={pay}
                >
                  Pay & Close Tab
                </button>

                <div className="text-xs text-[color:var(--muted)]">
                  M-Pesa STK Push integration can be added later; this MVP records the payment.
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
              <div className="mb-2 text-sm font-semibold">Payment</div>
              <div className="text-xs text-[color:var(--muted)]">
                Payments are handled by the bar or manager. You can add items to the tab but cannot
                close it from this account.
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Menu</div>
              <button
                className="h-9 rounded-xl border border-[color:var(--border)] bg-black/20 px-3 text-xs hover:bg-black/30"
                onClick={() => router.refresh()}
              >
                Refresh
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`h-9 rounded-xl border px-3 text-xs ${c.id === activeCategoryId
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-black"
                    : "border-[color:var(--border)] bg-black/20 hover:bg-black/30"
                    }`}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(activeCategory?.products ?? []).map((p) => (
                <button
                  key={p.id}
                  className="min-h-[56px] rounded-2xl border border-[color:var(--border)] bg-black/20 p-3 text-left hover:bg-black/30 disabled:opacity-50"
                  disabled={p.is86d || tab?.status !== "OPEN"}
                  onClick={() => addItem(p)}
                >
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-[color:var(--muted)]">{formatKes(p.priceCents)}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

