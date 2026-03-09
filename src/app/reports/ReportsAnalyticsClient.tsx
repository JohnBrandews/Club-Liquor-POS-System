"use client";

import { useEffect, useState } from "react";
import { formatKes } from "@/lib/money";

type HourlyPoint = { label: string; totalCents: number };
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
  period: "daily" | "monthly" | "yearly";
  summary: {
    totalCents: number;
    transactions: number;
    cashCents: number;
    mpesaCents: number;
  };
  chartPoints: HourlyPoint[];
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
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/analytics?date=${encodeURIComponent(date)}&period=${period}`, {
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
  }, [date, period]);

  const chart = data?.chartPoints ?? [];
  const topQty = data?.topByQty ?? [];
  const topRevenue = data?.topByRevenue ?? [];
  const staff = data?.staffPerformance ?? [];

  const maxChart = Math.max(0, ...chart.map((p) => p.totalCents));
  const maxQty = Math.max(0, ...topQty.map((p) => p.value));
  const maxRev = Math.max(0, ...topRevenue.map((p) => p.value));
  const maxStaffSales = Math.max(0, ...staff.map((s) => s.totalSalesCents));

  const periodLabel = period === "daily" ? "Daily" : period === "monthly" ? "Monthly" : "Yearly";

  return (
    <div className="py-4 px-4 sm:px-6">
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="text-xs font-bold tracking-widest text-[color:var(--muted)] uppercase">
            REPORTS & ANALYTICS
          </div>
          <h1 className="text-2xl font-black text-white mt-1">{periodLabel} Performance</h1>
          <p className="mt-1 text-xs text-[color:var(--muted)] font-medium uppercase tracking-tight max-w-xl">
            {period === "daily" ? "Hourly sales, best sellers, and staff performance for today." :
              period === "monthly" ? "Daily sales breakdown and total performance for this month." :
                "Monthly sales breakdown and total performance for this year."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setPeriod("daily")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === "daily" ? "bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20" : "text-[color:var(--muted)] hover:text-white"}`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === "monthly" ? "bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20" : "text-[color:var(--muted)] hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === "yearly" ? "bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20" : "text-[color:var(--muted)] hover:text-white"}`}
            >
              Yearly
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <label className="flex flex-1 sm:flex-none flex-col sm:flex-row sm:items-center gap-2 text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest">
              <span className="sm:inline">Select Date</span>
              <input
                type={period === "daily" ? "date" : period === "monthly" ? "month" : "number"}
                {...(period === "yearly" ? { min: 2000, max: 2100 } : {})}
                className="h-10 w-full sm:w-40 rounded-xl border border-[color:var(--border)] bg-[#1e293b] px-4 text-xs font-bold text-white outline-none focus:border-[color:var(--primary)]/50 transition-all"
                value={period === "yearly" ? date.slice(0, 4) : period === "monthly" ? date.slice(0, 7) : date}
                onChange={(e) => {
                  const val = e.target.value;
                  if (period === "yearly") setDate(`${val}-01-01`);
                  else if (period === "monthly") setDate(`${val}-01`);
                  else setDate(val);
                }}
              />
            </label>
            <button
              className="h-10 flex-1 sm:flex-none rounded-xl bg-white/5 px-6 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all border border-white/10"
              onClick={() => setDate(todayEatIsoDate())}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs font-bold text-red-200 uppercase tracking-widest text-center">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={`${periodLabel} Sales`}
          value={formatKes(data?.summary.totalCents ?? 0)}
          tone="accent"
        />
        <SummaryCard
          label="Transactions"
          value={(data?.summary.transactions ?? 0).toLocaleString()}
        />
        <SummaryCard
          label="M-Pesa"
          value={formatKes(data?.summary.mpesaCents ?? 0)}
        />
        <SummaryCard
          label="Cash"
          value={formatKes(data?.summary.cashCents ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {period === "daily" ? "Hourly Sales Flow" : period === "monthly" ? "Daily Revenue Trend" : "Monthly Revenue Trend"} (KES)
            </div>
          </div>
          <HourlyLineChart points={chart} max={maxChart} />
        </div>

        <div className="rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8">
          <div className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">Top Products by Quantity</div>
          <BarChart points={topQty} max={maxQty} />
        </div>

        <div className="rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8">
          <div className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">Top Products by Revenue</div>
          <BarChart
            points={topRevenue}
            max={maxRev}
            formatValue={(v: number) => formatKes(v)}
          />
        </div>

        <div className="rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8 overflow-hidden">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">Staff Performance</div>
          <div className="mb-6 text-[9px] font-medium text-[color:var(--muted)] uppercase tracking-tight">
            Per-staff sales value and orders handled this {period === "yearly" ? "year" : period === "monthly" ? "month" : "day"}.
          </div>
          <div className="space-y-3">
            {staff.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-white uppercase tracking-wide">{s.name}</div>
                    <div className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-widest mt-0.5">
                      {s.role} • {s.orderCount} orders
                    </div>
                  </div>
                  <div className="text-sm font-black text-[color:var(--primary)]">
                    {formatKes(s.totalSalesCents)}
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent2)] shadow-[0_0_8px_rgba(var(--accent2-rgb),0.5)]"
                    style={{
                      width: maxStaffSales
                        ? `${Math.max(4, (s.totalSalesCents / maxStaffSales) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
            {staff.length === 0 && !loading ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest">
                No activity recorded.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div className={`rounded-3xl border p-6 ${tone === "accent" ? "bg-[color:var(--primary)]/10 border-[color:var(--primary)]/30 text-[color:var(--primary)]" : "bg-[#1e293b] border-[color:var(--border)] text-white"}`}>
      <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${tone === "accent" ? "text-[color:var(--primary)] opacity-80" : "text-[color:var(--muted)]"}`}>
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function HourlyLineChart({ points, max }: { points: HourlyPoint[]; max: number }) {
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
        No sales recorded for this period.
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

  const pts = points.map((p, i) => ({
    x: padX + i * stepX,
    y: height - padY - (max ? (p.totalCents / max) * graphHeight : 0),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = pts.length > 0 ? `${linePath} L${pts[pts.length - 1].x},${height - padY} L${pts[0].x},${height - padY} Z` : "";

  const labelInterval = points.length > 24 ? 5 : points.length > 12 ? 2 : 1;

  return (
    <div className="relative mt-8">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={width - padX}
            y1={padY + p * graphHeight}
            y2={padY + p * graphHeight}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => (
          (i % labelInterval === 0 || i === pts.length - 1) && (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill="#020617" stroke="var(--primary)" strokeWidth={3} />
            </g>
          )
        ))}
      </svg>
      <div className="mt-6 flex justify-between px-[30px] text-[9px] font-black uppercase tracking-tighter text-[color:var(--muted)]">
        {points.map((p, i) => (
          (i % labelInterval === 0 || i === points.length - 1) ? (
            <span key={i} style={{ width: 0, overflow: 'visible', display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }}>
              {p.label}
            </span>
          ) : null
        ))}
      </div>
    </div>
  );
}

const BAR_COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#6366f1"];

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
      <div className="flex h-48 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
        No sales data available.
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
    <div className="mt-8">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={width - padX}
            y1={padY + p * graphHeight}
            y2={padY + p * graphHeight}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
        ))}

        {points.map((p, i) => {
          const barHeight = max ? (p.value / max) * graphHeight : 0;
          const x = padX + i * (barWidth + barGap);
          const y = height - padY - barHeight;
          const color = BAR_COLORS[i % BAR_COLORS.length];

          return (
            <g key={i} className="group transition-all">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={6}
                className="opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="fill-white text-[8px] font-black"
                style={{ fontSize: 8 }}
              >
                {formatValue ? formatValue(p.value) : p.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padY + 12}
                textAnchor="middle"
                className="fill-[color:var(--muted)] text-[7px] font-black uppercase tracking-tighter"
                style={{ fontSize: 7 }}
              >
                {p.name.length > 10 ? p.name.slice(0, 8) + ".." : p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
