import "dotenv/config";

import { PrismaClient, Role, TableSection, TableStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

function kes(cents: number) {
  return Math.round(cents);
}

async function upsertCategory(name: string, displayOrder: number) {
  return await prisma.category.upsert({
    where: { name },
    update: { displayOrder },
    create: { name, displayOrder },
  });
}

async function upsertProduct(input: {
  name: string;
  categoryId: string;
  priceCents: number;
  stockQty?: number;
  stockUnit?: string;
  reorderLevel?: number;
  isPopular?: boolean;
}) {
  return await prisma.product.upsert({
    where: { name: input.name },
    update: {
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      stockQty: input.stockQty ?? 0,
      stockUnit: input.stockUnit ?? "unit",
      reorderLevel: input.reorderLevel ?? 0,
      isPopular: input.isPopular ?? false,
      isActive: true,
    },
    create: {
      name: input.name,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      stockQty: input.stockQty ?? 0,
      stockUnit: input.stockUnit ?? "unit",
      reorderLevel: input.reorderLevel ?? 0,
      isPopular: input.isPopular ?? false,
    },
  });
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  return await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      isActive: true,
      passwordHash,
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
      isActive: true,
    },
  });
}

async function ensureFloorPlan(name: string) {
  const existing = await prisma.floorPlan.findFirst({ where: { name } });
  if (existing) return existing;
  return await prisma.floorPlan.create({ data: { name, isActive: true } });
}

async function upsertTable(input: {
  label: string;
  section: TableSection;
  floorPlanId: string;
  posX: number;
  posY: number;
  width?: number;
  height?: number;
}) {
  return await prisma.table.upsert({
    where: { label: input.label },
    update: {
      section: input.section,
      floorPlanId: input.floorPlanId,
      posX: input.posX,
      posY: input.posY,
      width: input.width ?? 1,
      height: input.height ?? 1,
      status: TableStatus.EMPTY,
      openedAt: null,
      currentTabId: null,
      assignedWaiterId: null,
    },
    create: {
      label: input.label,
      section: input.section,
      floorPlanId: input.floorPlanId,
      posX: input.posX,
      posY: input.posY,
      width: input.width ?? 1,
      height: input.height ?? 1,
      status: TableStatus.EMPTY,
    },
  });
}

async function main() {
  const beers = await upsertCategory("Beers", 10);
  const spirits = await upsertCategory("Spirits", 20);
  const shots = await upsertCategory("Shots", 30);
  const cocktails = await upsertCategory("Cocktails", 40);
  const mixers = await upsertCategory("Mixers", 50);
  const soft = await upsertCategory("Soft Drinks", 60);
  const wine = await upsertCategory("Wine", 70);
  const food = await upsertCategory("Food/Snacks", 80);
  const packages = await upsertCategory("Packages", 90);

  await upsertProduct({
    name: "Tusker",
    categoryId: beers.id,
    priceCents: kes(25000),
    stockQty: 240,
    stockUnit: "bottle",
    reorderLevel: 24,
    isPopular: true,
  });
  await upsertProduct({
    name: "Guinness",
    categoryId: beers.id,
    priceCents: kes(30000),
    stockQty: 120,
    stockUnit: "can",
    reorderLevel: 24,
    isPopular: true,
  });
  await upsertProduct({
    name: "Heineken",
    categoryId: beers.id,
    priceCents: kes(35000),
    stockQty: 96,
    stockUnit: "bottle",
    reorderLevel: 24,
  });
  await upsertProduct({
    name: "Balozi",
    categoryId: beers.id,
    priceCents: kes(20000),
    stockQty: 144,
    stockUnit: "bottle",
    reorderLevel: 24,
  });

  await upsertProduct({
    name: "Jameson 750ml",
    categoryId: spirits.id,
    priceCents: kes(450000),
    stockQty: 24,
    stockUnit: "bottle",
    reorderLevel: 6,
    isPopular: true,
  });
  await upsertProduct({
    name: "Johnnie Walker Black",
    categoryId: spirits.id,
    priceCents: kes(650000),
    stockQty: 12,
    stockUnit: "bottle",
    reorderLevel: 4,
    isPopular: true,
  });
  await upsertProduct({
    name: "Smirnoff Vodka",
    categoryId: spirits.id,
    priceCents: kes(350000),
    stockQty: 18,
    stockUnit: "bottle",
    reorderLevel: 4,
  });
  await upsertProduct({
    name: "Gilbeys Gin",
    categoryId: spirits.id,
    priceCents: kes(280000),
    stockQty: 18,
    stockUnit: "bottle",
    reorderLevel: 4,
  });

  await upsertProduct({
    name: "Tequila shot",
    categoryId: shots.id,
    priceCents: kes(30000),
    stockQty: 9999,
    stockUnit: "shot",
  });
  await upsertProduct({
    name: "Whisky shot",
    categoryId: shots.id,
    priceCents: kes(35000),
    stockQty: 9999,
    stockUnit: "shot",
  });

  await upsertProduct({
    name: "Mojito",
    categoryId: cocktails.id,
    priceCents: kes(60000),
    stockQty: 9999,
    stockUnit: "glass",
    isPopular: true,
  });
  await upsertProduct({
    name: "Dawa",
    categoryId: cocktails.id,
    priceCents: kes(70000),
    stockQty: 9999,
    stockUnit: "glass",
    isPopular: true,
  });
  await upsertProduct({
    name: "Gin & Tonic",
    categoryId: cocktails.id,
    priceCents: kes(50000),
    stockQty: 9999,
    stockUnit: "glass",
    isPopular: true,
  });

  await upsertProduct({
    name: "Red Bull",
    categoryId: mixers.id,
    priceCents: kes(35000),
    stockQty: 96,
    stockUnit: "can",
    reorderLevel: 24,
    isPopular: true,
  });
  await upsertProduct({
    name: "Sprite",
    categoryId: mixers.id,
    priceCents: kes(15000),
    stockQty: 120,
    stockUnit: "bottle",
    reorderLevel: 24,
  });
  await upsertProduct({
    name: "Soda",
    categoryId: mixers.id,
    priceCents: kes(10000),
    stockQty: 240,
    stockUnit: "bottle",
    reorderLevel: 24,
  });
  await upsertProduct({
    name: "Water",
    categoryId: soft.id,
    priceCents: kes(10000),
    stockQty: 240,
    stockUnit: "bottle",
    reorderLevel: 24,
  });

  await upsertProduct({
    name: "Jameson Package — bottle + 6 mixers",
    categoryId: packages.id,
    priceCents: kes(550000),
    stockQty: 9999,
    stockUnit: "package",
    isPopular: true,
  });
  await upsertProduct({
    name: "JW Black Package — bottle + 6 mixers",
    categoryId: packages.id,
    priceCents: kes(750000),
    stockQty: 9999,
    stockUnit: "package",
    isPopular: true,
  });

  await upsertUser({
    email: "admin@club.com",
    name: "Admin",
    role: Role.ADMIN,
    password: "Admin123",
  });
  await upsertUser({
    email: "manager@club.com",
    name: "Manager",
    role: Role.MANAGER,
    password: "Manager123",
  });
  await upsertUser({
    email: "bartender@club.com",
    name: "Bartender",
    role: Role.BARTENDER,
    password: "Bartender123",
  });
  await upsertUser({
    email: "waiter@club.com",
    name: "Waiter",
    role: Role.WAITER,
    password: "Waiter123",
  });

  const floorPlan = await ensureFloorPlan("Default");

  // Main Floor: 1-15 (5x3)
  for (let i = 1; i <= 15; i++) {
    const col = (i - 1) % 5;
    const row = Math.floor((i - 1) / 5);
    await upsertTable({
      label: `Table ${i}`,
      section: TableSection.MAIN_FLOOR,
      floorPlanId: floorPlan.id,
      posX: col * 2,
      posY: row * 2,
    });
  }

  // VIP: 1-5 (row)
  for (let i = 1; i <= 5; i++) {
    await upsertTable({
      label: `VIP ${i}`,
      section: TableSection.VIP,
      floorPlanId: floorPlan.id,
      posX: (i - 1) * 2,
      posY: 8,
      width: 2,
      height: 1,
    });
  }

  // Bar counter: 1-10 (two rows)
  for (let i = 1; i <= 10; i++) {
    const col = (i - 1) % 5;
    const row = Math.floor((i - 1) / 5);
    await upsertTable({
      label: `Bar ${i}`,
      section: TableSection.BAR_COUNTER,
      floorPlanId: floorPlan.id,
      posX: col * 2,
      posY: 11 + row * 2,
      width: 2,
      height: 1,
    });
  }

  // Assign a default set of tables to the waiter account so waiter views are meaningful.
  const waiter = await prisma.user.findUnique({ where: { email: "waiter@club.com" } });
  if (waiter) {
    await prisma.table.updateMany({
      where: { label: { in: ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5"] } },
      data: { assignedWaiterId: waiter.id },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

