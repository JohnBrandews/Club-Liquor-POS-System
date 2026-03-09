"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  stockQty: number;
};

type ReceiptData = {
  tab: any;
  totals: any;
  payments: any[];
  changeCents: number;
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

  const [me, setMe] = useState<{ role: UserRole; name: string } | null>(null);
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
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [_pendingUpdateCount, setPendingUpdateCount] = useState(0); // Trigger re-renders
  const pendingUpdateIdsRef = useRef<Set<string>>(new Set());

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

        // Merge logic to prevent overwriting pending updates
        setTab((prev) => {
          if (!prev) return json.tab;
          const mergedItems = json.tab.orderItems.map((newItem: any) => {
            if (pendingUpdateIdsRef.current.has(newItem.id)) {
              const existingItem = prev.orderItems.find((it) => it.id === newItem.id);
              return existingItem || newItem;
            }
            return newItem;
          });
          return { ...json.tab, orderItems: mergedItems };
        });

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
    fetchJson("/api/pos/menu", { cache: "no-store" })
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

  const optimisticTotals = useMemo(() => {
    if (!tab) return totals;
    const subtotalCents = tab.orderItems
      .filter((it) => !it.voidedAt)
      .reduce((sum, it) => sum + it.totalPriceCents, 0);

    const serviceChargeCents = serviceChargeEnabled
      ? Math.round((subtotalCents * (tab.serviceChargeRateBps || 1000)) / 10_000)
      : 0;
    const vatBase = subtotalCents + serviceChargeCents;
    const vatCents = Math.round((vatBase * (tab.vatRateBps || 1600)) / 10_000);
    const totalCents = subtotalCents + serviceChargeCents + vatCents;

    return { subtotalCents, serviceChargeCents, vatCents, totalCents };
  }, [tab, totals, serviceChargeEnabled]);

  const payableCents = optimisticTotals?.totalCents ?? 0;

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

    // Track this update as pending
    pendingUpdateIdsRef.current.add(item.id);
    setPendingUpdateCount((c) => c + 1);

    // Optimistic update
    setTab((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orderItems: prev.orderItems.map((it) =>
          it.id === item.id
            ? { ...it, qty: newQty, totalPriceCents: it.unitPriceCents * newQty }
            : it,
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
      router.refresh();
    } finally {
      // Clear pending after a short delay to let server state settle
      setTimeout(() => {
        pendingUpdateIdsRef.current.delete(item.id);
        setPendingUpdateCount((c) => c + 1);
      }, 3000);
    }
  }

  async function removeItem(item: OrderItem) {
    if (!tab || tab.status !== "OPEN" || item._optimistic) return;
    if (!window.confirm("Remove this item?")) return;

    setTab((prev) => {
      if (!prev) return prev;
      return { ...prev, orderItems: prev.orderItems.filter((it) => it.id !== item.id) };
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
    if (!input) return 0;
    // Allow digits and a single decimal point
    const clean = input.replace(/[^0-9.]/g, "");
    const kes = parseFloat(clean);
    if (isNaN(kes)) return 0;
    return Math.round(kes * 100);
  }

  async function pay() {
    if (!tab || payableCents <= 0 || paying) return;

    const parsedCashReceived = parseKesToCents(cashReceivedKes);
    const mpesaAmountCents = parseKesToCents(mpesaAmountKes);

    // Frontend validation
    if (payMethod === "CASH" && parsedCashReceived < payableCents) {
      alert(`Insufficient cash! Need ${formatKes(payableCents)}`);
      return;
    }
    if (payMethod === "SPLIT") {
      const cashDue = payableCents - mpesaAmountCents;
      if (parsedCashReceived < cashDue) {
        alert(`Insufficient cash! Need ${formatKes(cashDue)} + M-Pesa ${formatKes(mpesaAmountCents)}`);
        return;
      }
    }

    setPaying(true);
    try {
      const payload: Record<string, unknown> = {
        method: payMethod,
      };

      if (payMethod === "CASH") {
        payload.cashReceivedCents = parsedCashReceived;
      } else if (payMethod === "MPESA") {
        payload.mpesaPhone = mpesaPhone.trim();
        payload.mpesaRef = mpesaRef.trim() || undefined;
      } else {
        payload.mpesaPhone = mpesaPhone.trim();
        payload.mpesaRef = mpesaRef.trim() || undefined;
        payload.mpesaAmountCents = mpesaAmountCents;
        payload.cashReceivedCents = parsedCashReceived;
      }

      if (canOverrideServiceCharge) {
        payload.serviceChargeEnabled = serviceChargeEnabled;
      }

      const json = await fetchJson(`/api/pos/tabs/${tab.id}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (json.ok) {
        setReceipt({
          tab,
          totals: optimisticTotals,
          payments: json.paymentIds || [],
          changeCents: json.changeCents,
        });

        setTimeout(() => {
          window.print();
          router.push("/pos");
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            className="h-10 w-full sm:w-auto rounded-xl border border-[color:var(--border)] bg-black/20 px-4 text-xs font-bold uppercase tracking-wider hover:bg-black/30 transition-all font-mono"
            onClick={() => router.push("/pos")}
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/90">Current Items</h2>
            <div className="text-[10px] font-bold text-[color:var(--muted)] uppercase">{loading ? "Syncing..." : "Live"}</div>
          </div>

          <div className="space-y-3">
            {tab?.orderItems?.length ? (
              tab.orderItems.map((it) => (
                <div
                  key={it.id}
                  className={`group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-black/20 p-4 transition-all hover:bg-black/30 ${it.voidedAt ? "opacity-50 grayscale" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate text-base font-bold text-white group-hover:text-[color:var(--primary)] transition-colors">
                          {it.product.name}
                        </div>
                        <button
                          className="text-[color:var(--muted)] hover:text-red-400 p-1 transition-colors"
                          onClick={() => it.voidedAt ? voidItem(it) : removeItem(it)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="mt-1 text-xs font-bold text-[color:var(--primary)] uppercase tracking-tight">
                        {formatKes(it.unitPriceCents)} each
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-xl bg-black/20 p-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/30 text-white disabled:opacity-20"
                        disabled={it.qty <= 1 || !!it.voidedAt || tab?.status !== "OPEN"}
                        onClick={() => updateQty(it, it.qty - 1)}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-black text-white">{it.qty}</span>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/30 text-white disabled:opacity-20"
                        disabled={!!it.voidedAt || tab?.status !== "OPEN"}
                        onClick={() => updateQty(it, it.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-white">{formatKes(it.totalPriceCents)}</div>
                    </div>
                  </div>

                  {it.voidedAt && (
                    <div className="mt-2 text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      VOIDED: {it.voidReason || "Administrative removal"}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                <svg className="mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                <div className="text-xs font-black uppercase tracking-widest">Tab is empty</div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
            <div className="mb-3 text-sm font-semibold">Totals</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>Subtotal</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(optimisticTotals?.subtotalCents ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[color:var(--muted)]">
                <span>Service ({((tab?.serviceChargeRateBps ?? 1000) / 100).toFixed(0)}%)</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(optimisticTotals?.serviceChargeCents ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[color:var(--muted)]">
                <span>VAT ({((tab?.vatRateBps ?? 1600) / 100).toFixed(0)}%)</span>
                <span className="text-[color:var(--foreground)]">
                  {formatKes(optimisticTotals?.vatCents ?? 0)}
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
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20"
                      : "border-[color:var(--border)] bg-black/20 hover:bg-black/30"
                      }`}
                    onClick={() => setPayMethod(m)}
                  >
                    {m === "MPESA" ? "M-Pesa" : m}
                  </button>
                ))}
              </div>

              {payMethod === "SPLIT" && (
                <div className="mt-4 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Split Strategy</div>
                  <div className="text-[10px] text-blue-300/60 leading-tight">Enter the M-Pesa portion below; the remaining balance will be treated as Cash.</div>
                </div>
              )}

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
                  className="h-12 w-full rounded-xl bg-[color:var(--primary)] text-sm font-black uppercase tracking-widest text-white hover:brightness-110 shadow-lg shadow-[color:var(--primary)]/20 disabled:opacity-50"
                  disabled={!tab || tab.status !== "OPEN" || payableCents <= 0}
                  onClick={pay}
                >
                  Pay & Close Tab
                </button>

                <div className="text-xs text-[color:var(--muted)]">
                  M-Pesa STK Push integration can be added later; this records the payment.
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
                  className={`h-9 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest transition-all ${c.id === activeCategoryId
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20"
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
                  className={`min-h-[64px] rounded-2xl border p-3 text-left transition-all ${p.stockQty <= 0 || p.is86d ? 'bg-red-500/10 border-red-500/20 opacity-60 cursor-not-allowed' : 'bg-black/10 border-[color:var(--border)] hover:bg-black/20 hover:border-[color:var(--primary)]/30'}`}
                  disabled={p.is86d || p.stockQty <= 0 || tab?.status !== "OPEN"}
                  onClick={() => addItem(p)}
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="truncate text-sm font-bold text-white leading-tight">{p.name}</div>
                    {p.stockQty <= 5 && p.stockQty > 0 && (
                      <span className="text-[8px] font-black bg-yellow-500/20 text-yellow-500 px-1 rounded shrink-0">LOW</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px] font-bold text-[color:var(--primary)] tracking-tight">{formatKes(p.priceCents)}</div>
                    <div className={`text-[9px] font-black uppercase ${p.stockQty <= 0 ? 'text-red-500' : 'text-[color:var(--muted)]'}`}>
                      {p.stockQty <= 0 ? 'OUT' : `${p.stockQty} left`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Hidden Print Receipt Section */}
      {receipt && (
        <div className="fixed inset-0 z-[100] bg-white text-black p-8 print:block hidden overflow-y-auto">
          <div className="max-w-[300px] mx-auto text-center font-mono text-sm">
            <h1 className="text-xl font-bold uppercase mb-1">Club Liquor POS</h1>
            <p className="mb-1 text-xs">Nairobi, Kenya</p>
            <p className="mb-4 text-[10px]">Digital Receipt</p>

            <div className="border-t border-dashed border-black my-4" />

            <div className="text-left space-y-1 mb-4">
              <div className="flex justify-between">
                <span>Tab:</span>
                <span className="font-bold">{tabLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>Server:</span>
                <span>{me?.name || "Staff"}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-4" />

            <div className="space-y-2 mb-4">
              {(receipt.tab?.orderItems ?? []).map((it: any) => (
                <div key={it.id} className="flex justify-between items-start text-xs">
                  <div className="text-left w-3/4">
                    <div className="truncate">{it.product.name}</div>
                    <div className="text-[10px] opacity-60">{it.qty} x {formatKes(it.unitPriceCents)}</div>
                  </div>
                  <div className="font-bold shrink-0">{formatKes(it.totalPriceCents)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-4" />

            <div className="space-y-1 text-right">
              <div className="flex justify-between font-bold">
                <span>Subtotal:</span>
                <span>{formatKes(receipt.totals.subtotalCents)}</span>
              </div>
              {receipt.totals.serviceChargeCents > 0 && (
                <div className="flex justify-between">
                  <span>Service Chg:</span>
                  <span>{formatKes(receipt.totals.serviceChargeCents)}</span>
                </div>
              )}
              {receipt.totals.vatCents > 0 && (
                <div className="flex justify-between">
                  <span>VAT (16%):</span>
                  <span>{formatKes(receipt.totals.vatCents)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base pt-2">
                <span>TOTAL:</span>
                <span>{formatKes(receipt.totals.totalCents)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-4" />

            <div className="text-left text-xs mb-8">
              <p className="font-bold uppercase mb-1">Payment Method: {payMethod}</p>
              {receipt.changeCents > 0 && <p className="font-bold underline">Change Due: {formatKes(receipt.changeCents)}</p>}
            </div>

            <p className="text-[10px] font-bold">Thank you for visiting Club Liquor!</p>
            <p className="text-[8px] opacity-60 mt-1 italic">Software by JohnBrandews</p>
          </div>
        </div>
      )}
    </div>
  );
}
