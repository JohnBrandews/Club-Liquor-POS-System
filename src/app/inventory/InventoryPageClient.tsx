"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatKes } from "@/lib/money";

type InventoryProduct = {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    priceCents: number;
    stockQty: number;
    stockUnit: string;
    reorderLevel: number;
    isActive: boolean;
    is86d: boolean;
};

type Category = {
    id: string;
    name: string;
};

export function InventoryPageClient({
    initialProducts,
    categories
}: {
    initialProducts: InventoryProduct[],
    categories: Category[]
}) {
    const router = useRouter();
    const [products, setProducts] = useState<InventoryProduct[]>(initialProducts);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "LOW" | "UNAVAILABLE">("ALL");
    const [loading, setLoading] = useState(false);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [restockProduct, setRestockProduct] = useState<InventoryProduct | null>(null);
    const [restockQty, setRestockQty] = useState("0");

    // Add Product Form
    const [newName, setNewName] = useState("");
    const [newCategoryId, setNewCategoryId] = useState(categories[0]?.id || "");
    const [newPriceKes, setNewPriceKes] = useState("");
    const [newStockQty, setNewStockQty] = useState("0");
    const [newStockUnit, setNewStockUnit] = useState("unit");
    const [newReorderLevel, setNewReorderLevel] = useState("5");

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.categoryName.toLowerCase().includes(search.toLowerCase());

            const isLow = p.reorderLevel > 0 && p.stockQty <= p.reorderLevel;
            const isUnavailable = !p.isActive || p.is86d;

            if (filter === "LOW") return matchesSearch && isLow;
            if (filter === "UNAVAILABLE") return matchesSearch && isUnavailable;
            return matchesSearch;
        });
    }, [products, search, filter]);

    const groupedByCategory = useMemo(() => {
        const grouped: Record<string, InventoryProduct[]> = {};
        for (const p of filteredProducts) {
            if (!grouped[p.categoryName]) grouped[p.categoryName] = [];
            grouped[p.categoryName].push(p);
        }
        return grouped;
    }, [filteredProducts]);

    const stats = useMemo(() => {
        const total = products.length;
        const low = products.filter(p => p.reorderLevel > 0 && p.stockQty <= p.reorderLevel).length;
        const unavail = products.filter(p => !p.isActive || p.is86d).length;
        const value = products.reduce((sum, p) => sum + (p.priceCents * p.stockQty), 0);
        return { total, low, unavail, value };
    }, [products]);

    async function handleRestock(e: React.FormEvent) {
        e.preventDefault();
        if (!restockProduct || loading) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/products/${restockProduct.id}/restock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qty: parseInt(restockQty) }),
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(products.map(p => p.id === restockProduct.id ? { ...p, stockQty: data.stockQty } : p));
                setRestockProduct(null);
                setRestockQty("0");
            }
        } catch (err) { alert("Failed to restock"); }
        finally { setLoading(false); }
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/inventory/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    categoryId: newCategoryId,
                    priceCents: Math.round(parseFloat(newPriceKes) * 100),
                    stockQty: parseInt(newStockQty),
                    stockUnit: newStockUnit,
                    reorderLevel: parseInt(newReorderLevel),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setProducts([...products, {
                    ...data.product,
                    categoryName: categories.find(c => c.id === data.product.categoryId)?.name || "Other"
                }]);
                setShowAddModal(false);
                // Reset
                setNewName("");
                setNewPriceKes("");
                setNewStockQty("0");
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add product");
            }
        } catch (err) { alert("Network error"); }
        finally { setLoading(false); }
    }

    async function toggleAvailability(product: InventoryProduct) {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/products/${product.id}/toggle`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setProducts(products.map(p => p.id === product.id ? { ...p, is86d: data.product.is86d } : p));
            }
        } catch (err) { alert("Failed to toggle status"); }
        finally { setLoading(false); }
    }

    return (
        <div className="px-6 py-6">
            <div className="py-4">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold tracking-widest text-[color:var(--muted)] uppercase">
                            INVENTORY MANAGEMENT
                        </div>
                        <h1 className="text-2xl font-black text-white mt-1">Stock & Catalog</h1>
                        <p className="mt-1 text-xs text-[color:var(--muted)] font-medium uppercase tracking-tight">
                            Real-time view of bottles, mixers, and packages on hand.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="h-10 w-full sm:w-auto rounded-xl bg-[color:var(--primary)] px-6 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 transition-all shadow-lg shadow-[color:var(--primary)]/20"
                    >
                        + Add Product
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total Products" value={stats.total.toString()} />
                    <StatCard label="Low Stock" value={stats.low.toString()} tone="warning" />
                    <StatCard label="Unavailable" value={stats.unavail.toString()} tone="danger" />
                    <StatCard label="Total Value" value={formatKes(stats.value)} />
                </div>

                <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="inline-flex flex-wrap rounded-2xl bg-[#1e293b] p-1.5 border border-[color:var(--border)] overflow-x-auto">
                        <button
                            onClick={() => setFilter("ALL")}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === "ALL" ? "bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20" : "text-[color:var(--muted)] hover:text-white"}`}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilter("LOW")}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === "LOW" ? "bg-yellow-500 text-black" : "text-[color:var(--muted)] hover:text-white"}`}
                        >
                            Low ({stats.low})
                        </button>
                        <button
                            onClick={() => setFilter("UNAVAILABLE")}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === "UNAVAILABLE" ? "bg-red-500 text-black" : "text-[color:var(--muted)] hover:text-white"}`}
                        >
                            86'd ({stats.unavail})
                        </button>
                    </div>
                    <div className="relative w-full lg:max-w-xs">
                        <input
                            placeholder="Search catalog…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[#1e293b] px-4 pl-10 text-xs font-bold text-white outline-none focus:border-[color:var(--primary)]/50 transition-all"
                        />
                        <svg className="absolute left-3.5 top-3.5 text-[color:var(--muted)]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </div>
                </div>

                <div className="h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)] space-y-10 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(groupedByCategory).map(([categoryName, items]) => (
                        <section key={categoryName}>
                            <div className="mb-5 flex items-center gap-4">
                                <div className="h-px flex-1 bg-white/5" />
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">
                                    {categoryName}
                                </div>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {items.map((p) => {
                                    const isLow = p.reorderLevel > 0 && p.stockQty <= p.reorderLevel && p.stockQty > 0;
                                    const isOut = p.stockQty <= 0 || !p.isActive || p.is86d;
                                    return (
                                        <div key={p.id} className="group relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-5 transition-all hover:border-[color:var(--primary)]/40 hover:shadow-lg hover:shadow-[color:var(--primary)]/5">
                                            <div className="mb-4 flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-base font-black text-white group-hover:text-[color:var(--primary)] transition-colors">{p.name}</div>
                                                    <div className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-tighter">{categoryName}</div>
                                                </div>
                                                <div className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${isOut ? "bg-red-500/20 text-red-300" : isLow ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"
                                                    }`}>
                                                    {isOut ? "86'd" : isLow ? "Low" : "Live"}
                                                </div>
                                            </div>

                                            <div className="mb-5 text-2xl font-black text-white">{formatKes(p.priceCents)}</div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                                    <span className="text-[color:var(--muted)]">Status</span>
                                                    <span className={isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}>
                                                        {p.stockQty} {p.stockUnit}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-black/40 border border-white/5">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${isOut ? "bg-red-500" : isLow ? "bg-yellow-400" : "bg-emerald-400"
                                                            } ${!isOut && !isLow ? "shadow-[0_0_8px_rgba(52,211,153,0.5)]" : ""}`}
                                                        style={{ width: `${Math.min(100, (p.stockQty / Math.max(1, p.reorderLevel * 2 || 100)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-6 flex gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                                                <button
                                                    onClick={() => setRestockProduct(p)}
                                                    className="h-9 flex-1 rounded-xl bg-[color:var(--primary)] text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 shadow-lg shadow-[color:var(--primary)]/20"
                                                >
                                                    Restock
                                                </button>
                                                <button
                                                    onClick={() => toggleAvailability(p)}
                                                    className={`h-9 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p.is86d ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'}`}
                                                >
                                                    {p.is86d ? 'Enable' : '86\'d'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            {/* Add Product Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6">Create Product</h2>
                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Product Name</label>
                                    <input required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--accent)] outline-none" placeholder="e.g. Heineken 330ml" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Category</label>
                                    <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="w-full h-11 rounded-xl bg-[#1e293b] border border-white/10 px-4 text-sm appearance-none outline-none focus:border-[color:var(--primary)]">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Price (KES)</label>
                                        <input required type="number" step="0.01" value={newPriceKes} onChange={(e) => setNewPriceKes(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--accent)] outline-none" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Initial Stock</label>
                                        <input required type="number" value={newStockQty} onChange={(e) => setNewStockQty(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--accent)] outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Unit</label>
                                        <input required value={newStockUnit} onChange={(e) => setNewStockUnit(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--accent)] outline-none" placeholder="e.g. bottle" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Reorder Level</label>
                                        <input required type="number" value={newReorderLevel} onChange={(e) => setNewReorderLevel(e.target.value)} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--accent)] outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-11 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl bg-[color:var(--primary)] text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{loading ? 'Saving...' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Restock Modal */}
            {
                restockProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8 shadow-2xl">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Restock</h2>
                            <p className="text-xs text-[color:var(--muted)] font-bold mb-6">{restockProduct.name}</p>
                            <form onSubmit={handleRestock} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Quantity to Add</label>
                                    <input required type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-lg font-black text-white focus:border-[color:var(--accent)] outline-none" autoFocus />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setRestockProduct(null)} className="flex-1 h-11 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl bg-[color:var(--primary)] text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">Confirm</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
    const accentClass =
        tone === "warning" ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200" :
            tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200" :
                "border-[color:var(--border)] bg-[#1e293b] text-white";
    return (
        <div className={`rounded-3xl border p-5 ${accentClass}`}>
            <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${tone ? 'opacity-80' : 'text-[color:var(--muted)]'}`}>{label}</div>
            <div className="text-xl font-black">{value}</div>
        </div>
    );
}
