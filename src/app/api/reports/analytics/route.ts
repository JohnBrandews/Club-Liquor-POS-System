import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

function getEatRange(dateStr: string, period: string) {
  const base = new Date(`${dateStr}T00:00:00+03:00`);
  if (Number.isNaN(base.getTime())) throw new Error("BAD_DATE");

  const start = new Date(base);
  const end = new Date(base);

  if (period === "monthly") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(1);
  } else if (period === "yearly") {
    start.setMonth(0, 1);
    end.setFullYear(end.getFullYear() + 1);
    end.setMonth(0, 1);
  } else {
    // daily
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export async function GET(req: Request) {
  const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const period = url.searchParams.get("period") ?? "daily";

  let range: { start: Date; end: Date };
  try {
    range = getEatRange(date, period);
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: range.start, lt: range.end } },
    select: {
      amountCents: true,
      method: true,
      createdAt: true,
      processedById: true,
    },
  });

  const orderItems = await prisma.orderItem.findMany({
    where: { addedAt: { gte: range.start, lt: range.end }, voidedAt: null },
    select: {
      qty: true,
      totalPriceCents: true,
      addedAt: true,
      productId: true,
      addedById: true,
    },
  });

  const summary = {
    totalCents: 0,
    transactions: payments.length,
    cashCents: 0,
    mpesaCents: 0,
  };

  for (const p of payments) {
    summary.totalCents += p.amountCents;
    if (p.method === "CASH") summary.cashCents += p.amountCents;
    if (p.method === "MPESA") summary.mpesaCents += p.amountCents;
  }

  // Aggregate by sub-period (hour for daily, day for monthly, month for yearly)
  const chartPoints: { label: string; totalCents: number }[] = [];
  const pointsMap = new Map<string, number>();

  if (period === "monthly") {
    // Days of month
    const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
    for (const p of payments) {
      const day = new Date(p.createdAt).getDate().toString();
      pointsMap.set(day, (pointsMap.get(day) ?? 0) + p.amountCents);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      chartPoints.push({ label: d.toString(), totalCents: pointsMap.get(d.toString()) ?? 0 });
    }
  } else if (period === "yearly") {
    // Months of year
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const p of payments) {
      const monthIdx = new Date(p.createdAt).getMonth();
      const mName = months[monthIdx];
      pointsMap.set(mName, (pointsMap.get(mName) ?? 0) + p.amountCents);
    }
    for (const m of months) {
      chartPoints.push({ label: m, totalCents: pointsMap.get(m) ?? 0 });
    }
  } else {
    // Hourly
    for (const p of payments) {
      const hour = new Date(p.createdAt).getHours();
      pointsMap.set(hour.toString(), (pointsMap.get(hour.toString()) ?? 0) + p.amountCents);
    }
    for (let h = 0; h < 24; h++) {
      chartPoints.push({ label: `${h}:00`, totalCents: pointsMap.get(h.toString()) ?? 0 });
    }
  }

  const byProductQty = new Map<string, { name: string; qty: number; revenueCents: number }>();
  const productIds = Array.from(new Set(orderItems.map((o) => o.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  for (const it of orderItems) {
    const current = byProductQty.get(it.productId) ?? {
      name: productNameById.get(it.productId) ?? "Unknown",
      qty: 0,
      revenueCents: 0,
    };
    current.qty += it.qty;
    current.revenueCents += it.totalPriceCents;
    byProductQty.set(it.productId, current);
  }

  const productRows = Array.from(byProductQty.values());
  const topByQty = productRows
    .slice()
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
    .map((r) => ({ name: r.name, value: r.qty }));
  const topByRevenue = productRows
    .slice()
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 8)
    .map((r) => ({ name: r.name, value: r.revenueCents }));

  const salesByStaff = new Map<string, number>();
  for (const p of payments) {
    salesByStaff.set(p.processedById, (salesByStaff.get(p.processedById) ?? 0) + p.amountCents);
  }
  const ordersByStaff = new Map<string, number>();
  for (const it of orderItems) {
    ordersByStaff.set(it.addedById, (ordersByStaff.get(it.addedById) ?? 0) + it.qty);
  }

  const staffIds = Array.from(
    new Set([...salesByStaff.keys(), ...ordersByStaff.keys()]),
  );
  const staffUsers = await prisma.user.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true, role: true },
  });
  const staffPerformance = staffUsers.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    totalSalesCents: salesByStaff.get(u.id) ?? 0,
    orderCount: ordersByStaff.get(u.id) ?? 0,
  }));

  return NextResponse.json({
    ok: true,
    date,
    period,
    summary,
    chartPoints,
    topByQty,
    topByRevenue,
    staffPerformance,
  });
}

