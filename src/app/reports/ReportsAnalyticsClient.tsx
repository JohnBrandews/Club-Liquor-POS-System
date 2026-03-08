"use client";

import { useEffect, useMemo, useState } from "react";

import { formatKes } from "@/lib/money";

type HourlyPoint = { hourLabel: string; totalCents: number };

type ProductPoint = { name: string; value: number };

type StaffPoint = {
  id: string;
  name: string;
  role: string;
  totalSalesCents: number;
  orderCount: number;
};

type AnalyticsResponse = {
  ok: true;
  date: string;
  summary: {
    totalCents: number;
    transactions: number;
    cashCents: number;
    mpesaCents: number;
  };
  hourlySales: HourlyPoint[];
  topByQty: ProductPoint[];
  topByRevenue: ProductPoint[];
  staffPerformance: StaffPoint[];
};

function todayEatIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReportsAnalyticsClient() {
  const [date, setDate] = useState(todayEatIsoDate());
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/analytics?date=${encodeURIComponent(date)}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as AnalyticsResponse | null;
        if (!res.ok || !json?.ok) throw new Error((json as any)?.error ?? "Failed to load");
        if (!mounted) return;
        setData(json);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? String(e));
        setData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [date]);

  const hourly = data?.hourlySales ?? [];
  const topQty = data?.topByQty ?? [];
  const topRevenue = data?.topByRevenue ?? [];
  const staff = data?.staffPerformance ?? [];

  const maxHourly = Math.max(0, ...hourly.map((p) => p.totalCents));
  const maxQty = Math.max(0, ...topQty.map((p) => p.value));
  const maxRev = Math.max(0, ...topRevenue.map((p) => p.value));
  const maxStaffSales = Math.max(0, ...staff.map((s) => s.totalSalesCents));

  return (
    <div className="py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest text-[color:var(--muted)]">
            REPORTS &amp; ANALYTICS
          </div>
          <h1 className="text-xl font-semibold">Daily performance</h1>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Hourly sales, best sellers, and staff performance for the selected EAT date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <span>Date (EAT)</span>
            <input
              type="date"
              className="h-9 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-3 text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button
            className="h-9 rounded-xl border border-[color:var(--border)] bg-black/20 px-3 text-xs hover:bg-black/30"
            onClick={() => setDate(todayEatIsoDate())}
          >
            Today
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Total Sales"
          value={formatKes(data?.summary.totalCents ?? 0)}
        />
        <SummaryCard
          label="Transactions"
          value={(data?.summary.transactions ?? 0).toString()}
        />
        <SummaryCard
          label="M-Pesa Sales"
          value={formatKes(data?.summary.mpesaCents ?? 0)}
        />
        <SummaryCard
          label="Cash Sales"
          value={formatKes(data?.summary.cashCents ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[#0a1226]/50 p-6 text-xs backdrop-blur ring-1 ring-white/5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-widest text-[color:var(--muted)]">Hourly Sales (KES)</div>
          </div>
          <HourlyLineChart points={hourly} max={maxHourly} />
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[#0a1226]/50 p-6 text-xs backdrop-blur ring-1 ring-white/5">
          <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[color:var(--muted)]">Top Products by Quantity</div>
          <BarChart points={topQty} max={maxQty} />
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[#0a1226]/50 p-6 text-xs backdrop-blur ring-1 ring-white/5">
          <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[color:var(--muted)]">Top Products by Revenue</div>
          <BarChart
            points={topRevenue}
            max={maxRev}
            formatValue={(v: number) => formatKes(v)}
          />
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-xs backdrop-blur">
          <div className="mb-2 text-sm font-semibold">Staff Performance</div>
          <div className="mb-2 text-[10px] text-[color:var(--muted)]">
            Per-staff sales value and number of orders handled today.
          </div>
          <div className="space-y-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-[color:var(--border)] bg-black/20 p-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="text-[10px] text-[color:var(--muted)]">
                      {s.role} • {s.orderCount} orders
                    </div>
                  </div>
                  <div className="text-xs font-semibold">
                    {formatKes(s.totalSalesCents)}
                  </div>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent2)]"
                    style={{
                      width: maxStaffSales
                        ? `${Math.max(
                          4,
                          (s.totalSalesCents / maxStaffSales) * 100,
                        )}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
            {staff.length === 0 && !loading ? (
              <div className="rounded-xl border border-[color:var(--border)] bg-black/20 p-3 text-xs text-[color:var(--muted)]">
                No staff activity for this date.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-xs backdrop-blur">
      <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function HourlyLineChart({ points, max }: { points: HourlyPoint[]; max: number }) {
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-[color:var(--muted)]">
        No sales for this date.
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padX = 40;
  const padY = 30;
  const graphWidth = width - padX * 2;
  const graphHeight = height - padY * 2;
  const stepX = points.length > 1 ? graphWidth / (points.length - 1) : 0;

  const getPoints = () =>
    points.map((p, i) => ({
      x: padX + i * stepX,
      y: height - padY - (max ? (p.totalCents / max) * graphHeight : 0),
    }));

  const pts = getPoints();
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${height - padY} L${pts[0].x},${height - padY} Z`;

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={width - padX}
            y1={padY + p * graphHeight}
            y2={padY + p * graphHeight}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#050810" stroke="var(--accent)" strokeWidth={2} />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-[30px] text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">
        {points.filter((_, i) => i % 2 === 0).map((p) => (
          <span key={p.hourLabel}>{p.hourLabel}</span>
        ))}
      </div>
    </div>
  );
}

const BAR_COLORS = ["#00d4ff", "#7c3aed", "#ec4899", "#10b981", "#f59e0b"];

function BarChart({
  points,
  max,
  formatValue,
}: {
  points: ProductPoint[];
  max: number;
  formatValue?: (v: number) => string;
}) {
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-[color:var(--muted)]">
        No data for this date.
      </div>
    );
  }

  const width = 400;
  const height = 240;
  const padX = 30;
  const padY = 30;
  const barGap = 16;
  const graphWidth = width - padX * 2;
  const graphHeight = height - padY * 2;
  const barWidth = (graphWidth - (points.length - 1) * barGap) / points.length;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={width - padX}
            y1={padY + p * graphHeight}
            y2={padY + p * graphHeight}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
        ))}

        {points.map((p, i) => {
          const h = max ? (p.value / max) * graphHeight : 0;
          const x = padX + i * (barWidth + barGap);
          const y = height - padY - h;
          const color = BAR_COLORS[i % BAR_COLORS.length];
          return (
            <g key={i} className="group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill={color}
                rx={6}
                className="transition-all hover:brightness-125"
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fill="white"
                className="text-[10px] font-bold"
              >
                {formatValue ? formatValue(p.value) : p.value}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-around px-4">
        {points.map((p, i) => (
          <div key={i} className="flex max-w-[60px] flex-col items-center gap-1 text-center">
            <div className="truncate text-[9px] font-bold uppercase tracking-tighter text-[color:var(--muted)] w-full">
              {p.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

