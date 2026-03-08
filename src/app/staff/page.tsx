import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";

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

  return (
    <div className="px-6 py-6">
      <div className="py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-[color:var(--muted)]">
              STAFF MANAGEMENT
            </div>
            <h1 className="text-xl font-semibold">Staff & roles</h1>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              View all staff accounts across admin, managers, bartenders, and waiters.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-xs backdrop-blur">
          <table className="w-full border-collapse text-left">
            <thead className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[color:var(--border)]">
                  <td className="py-2 pr-3 text-sm font-medium">{u.name}</td>
                  <td className="py-2 pr-3 text-[color:var(--muted)]">{u.email}</td>
                  <td className="py-2 pr-3">
                    <span className="rounded-lg bg-[color:var(--accent2)]/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${u.isActive
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-red-500/15 text-red-200"
                        }`}
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[color:var(--muted)]">
                    {u.createdAt.toLocaleDateString("en-KE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


