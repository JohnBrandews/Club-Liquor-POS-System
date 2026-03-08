"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginState =
  | { status: "idle"; error?: undefined }
  | { status: "submitting"; error?: undefined }
  | { status: "error"; error: string };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("admin@club.com");
  const [password, setPassword] = useState("Admin123");
  const [state, setState] = useState<LoginState>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status === "submitting") return;

    setState({ status: "submitting" });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const msg = (await res?.json().catch(() => null))?.error ?? "Login failed";
      setState({ status: "error", error: msg });
      return;
    }

    router.replace(nextPath || "/pos");
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(1000px_600px_at_20%_-10%,rgba(0,212,255,0.25),transparent),radial-gradient(900px_500px_at_100%_0%,rgba(124,58,237,0.18),transparent)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 backdrop-blur neon-ring">
        <div className="mb-6">
          <div className="text-sm font-medium tracking-widest text-[color:var(--muted)]">
            CLUB POS
          </div>
          <h1 className="neon-text mt-2 text-2xl font-semibold">NeonPOS</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Sign in to start taking orders.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Email</span>
            <input
              className="mt-1 h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              inputMode="email"
              placeholder="staff@club.com"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[color:var(--muted)]">Password</span>
            <input
              className="mt-1 h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-solid)] px-4 text-base outline-none focus:border-[color:var(--accent)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              type="password"
              placeholder="••••••••"
            />
          </label>

          {state.status === "error" ? (
            <div className="rounded-xl border border-[color:var(--border)] bg-black/30 px-4 py-3 text-sm text-red-200">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-[color:var(--accent)] font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            disabled={state.status === "submitting"}
          >
            {state.status === "submitting" ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-xs text-[color:var(--muted)]">
            Seed accounts: admin@club.com / Admin123 (and Manager/Bartender/Waiter).
          </div>
        </form>
      </div>
    </div>
  );
}

