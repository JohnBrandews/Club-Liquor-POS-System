import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { formatKes } from "@/lib/money";

type InventoryProduct = {
  id: string;
  name: string;
  categoryName: string;
  priceCents: number;
  stockQty: number;
  stockUnit: string;
  reorderLevel: number;
  isActive: boolean;
  is86d: boolean;
};

export default async function InventoryPage() {
  const session = await getSession();

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
  });

  const mapped: InventoryProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    priceCents: p.priceCents,
    stockQty: p.stockQty,
    stockUnit: p.stockUnit,
    reorderLevel: p.reorderLevel,
    isActive: p.isActive,
    is86d: p.is86d,
  }));

  const totalProducts = mapped.length;
  const lowStock = mapped.filter((p) => p.reorderLevel > 0 && p.stockQty <= p.reorderLevel);
  const unavailable = mapped.filter((p) => !p.isActive || p.is86d);
  const totalValueCents = mapped.reduce(
    (sum, p) => sum + p.priceCents * p.stockQty,
    0,
  );

  const groupedByCategory: Record<string, InventoryProduct[]> = {};
  for (const p of mapped) {
    if (!groupedByCategory[p.categoryName]) groupedByCategory[p.categoryName] = [];
    groupedByCategory[p.categoryName].push(p);
  }

  return (
    <div className="px-6 py-6">
      <div className="py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-[color:var(--muted)]">
              INVENTORY MANAGEMENT
            </div>
            <h1 className="text-xl font-semibold">Inventory & stock tracking</h1>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Real-time view of bottles, mixers, and packages on hand.
            </p>
          </div>
          <button className="h-9 rounded-xl bg-[color:var(--accent)] px-4 text-xs font-semibold text-black hover:brightness-110">
            + Add Product
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatCard label="Total Products" value={totalProducts.toString()} />
          <StatCard label="Low Stock" value={lowStock.length.toString()} tone="warning" />
          <StatCard label="Unavailable" value={unavailable.length.toString()} tone="danger" />
          <StatCard label="Total Value" value={formatKes(totalValueCents)} />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-black/40 p-1 text-xs">
            <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-black">
              All Items ({totalProducts})
            </span>
            <span className="px-3 py-1 text-[color:var(--muted)]">
              Low Stock ({lowStock.length})
            </span>
            <span className="px-3 py-1 text-[color:var(--muted)]">
              Unavailable ({unavailable.length})
            </span>
          </div>
          <input
            placeholder="Search products…"
            className="h-9 w-full max-w-xs rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-3 text-xs outline-none focus:border-[color:var(--accent)]"
          />
        </div>

        <div className="h-[calc(100vh-280px)] space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(groupedByCategory).map(([categoryName, items]) => (
            <section key={categoryName}>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[color:var(--border)]" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                  {categoryName}
                </div>
                <div className="h-px flex-1 bg-[color:var(--border)]" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((p) => {
                  const isLow =
                    p.reorderLevel > 0 && p.stockQty <= p.reorderLevel && p.stockQty > 0;
                  const isOut = p.stockQty <= 0 || !p.isActive || p.is86d;
                  return (
                    <div
                      key={p.id}
                      className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[#0a1226]/40 p-4 transition-all hover:border-[color:var(--accent)]/40 hover:bg-[#0a1226]/60"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold group-hover:text-[color:var(--accent)]">{p.name}</div>
                          <div className="text-[10px] text-[color:var(--muted)]">{categoryName}</div>
                        </div>
                        <div className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isOut ? "bg-red-500/15 text-red-200" : isLow ? "bg-yellow-500/15 text-yellow-200" : "bg-emerald-500/15 text-emerald-200"
                          }`}>
                          {isOut ? "86'd" : isLow ? "Low" : "Live"}
                        </div>
                      </div>

                      <div className="mb-4 text-xl font-black text-[color:var(--foreground)]">{formatKes(p.priceCents)}</div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[color:var(--muted)]">Inventory</span>
                          <span className={isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}>
                            {p.stockQty} {p.stockUnit}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isOut ? "bg-red-500" : isLow ? "bg-yellow-400" : "bg-emerald-400"
                              } ${!isOut && !isLow ? "neon-ring" : ""}`}
                            style={{
                              width: `${Math.min(100, (p.stockQty / Math.max(1, p.reorderLevel * 2 || 100)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                        <button className="h-8 flex-1 rounded-xl bg-[color:var(--accent)] text-[10px] font-bold text-black hover:brightness-110">
                          Restock
                        </button>
                        <button className="h-8 flex-1 rounded-xl bg-white/5 text-[10px] font-bold text-[color:var(--muted)] hover:bg-white/10 hover:text-white">
                          Details
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
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  const accentClass =
    tone === "warning"
      ? "border-yellow-500/40 bg-yellow-500/10"
      : tone === "danger"
        ? "border-red-500/40 bg-red-500/10"
        : "border-[color:var(--border)] bg-[color:var(--panel)]";
  return (
    <div className={`rounded-2xl border p-4 text-xs backdrop-blur ${accentClass}`}>
      <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}


