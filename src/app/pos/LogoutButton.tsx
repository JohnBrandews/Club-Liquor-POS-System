"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      className="h-10 rounded-xl border border-[color:var(--border)] bg-black/20 px-4 text-sm hover:bg-black/30 disabled:opacity-60"
      disabled={loading}
      onClick={async () => {
        if (loading) return;
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        window.location.href = "/login";
      }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

