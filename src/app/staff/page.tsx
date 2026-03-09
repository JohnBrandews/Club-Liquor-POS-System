import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { StaffPageClient } from "./StaffPageClient";

export default async function StaffPage() {
  const session = await getSession();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Serialize dates for client components
  const serializedUsers = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString()
  }));

  return <StaffPageClient initialUsers={serializedUsers} />;
}


