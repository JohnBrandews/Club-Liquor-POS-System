"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FloatingLines from "@/components/FloatingLines";

type LoginState =
  | { status: "idle"; error?: undefined }
  | { status: "submitting"; error?: undefined }
  | { status: "error"; error: string };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>({ status: "idle" });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (forgotLoading || !forgotEmail) return;

    setForgotLoading(true);
    setForgotMessage(null);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMessage({ type: 'success', text: data.message });
      } else {
        setForgotMessage({ type: 'error', text: data.error || "Failed to send request" });
      }
    } catch {
      setForgotMessage({ type: 'error', text: "Network error" });
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black px-4 py-10 flex items-center justify-center">
      <div className="absolute inset-0 z-0 opacity-30">
        <FloatingLines
          linesGradient={["#4764f5", "#15319d", "#4764f5"]}
          animationSpeed={1}
          interactive
          bendRadius={5}
          bendStrength={-0.5}
          mouseDamping={0.05}
          parallax
          parallaxStrength={0.2}
          topWavePosition={{ x: 10.0, y: 0.5, rotate: -0.4 }}
          middleWavePosition={{ x: 5.0, y: 0.0, rotate: 0.2 }}
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[color:var(--panel)] p-8 backdrop-blur-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <div className="mb-8 text-center sm:text-left">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Club Liquor POS" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="neon-text mt-2 text-3xl font-black text-white uppercase tracking-tight text-center">Club Liquor POS</h1>
          <p className="mt-2 text-sm font-medium text-[color:var(--muted)]">
            Sign in to start taking orders.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
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
            className="h-12 w-full rounded-xl bg-[color:var(--primary)] font-black uppercase tracking-widest text-white transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-60"
            disabled={state.status === "submitting"}
          >
            {state.status === "submitting" ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs font-bold text-[color:var(--muted)] hover:text-[color:var(--primary)] transition-colors uppercase tracking-widest"
            >
              Forgot Password?
            </button>
          </div>
          {/* <div className="text-xs text-[color:var(--muted)]">
            Seed accounts: admin@club.com / Admin123 (and Manager/Bartender/Waiter).
          </div> */}
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[color:var(--panel)] p-8 shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Reset Password</h2>
            <p className="text-xs text-[color:var(--muted)] mb-6">
              Enter your email address to request a password reset from the administrator.
            </p>

            <form onSubmit={onForgotSubmit} className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Your Login Email</span>
                <input
                  required
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--primary)] outline-none transition-all"
                  placeholder="staff@club.com"
                />
              </label>

              {forgotMessage && (
                <div className={`rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-wider ${forgotMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {forgotMessage.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotMessage(null); }}
                  className="flex-1 h-11 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)] hover:bg-white/5 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 h-11 rounded-xl bg-[color:var(--primary)] text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 transition-all shadow-lg shadow-[color:var(--primary)]/20 disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Request Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

