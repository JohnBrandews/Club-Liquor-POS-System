"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FloatingLines from "@/components/FloatingLines";

export default function InviteClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState("");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("No invitation token found.");
            setLoading(false);
            return;
        }

        fetch(`/api/auth/invite?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setUser(data.user);
                }
            })
            .catch(() => setError("Failed to verify invitation."))
            .finally(() => setLoading(false));
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) {
            alert("Passwords do not match!");
            return;
        }
        if (password.length < 8) {
            alert("Password must be at least 8 characters.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    window.location.href = "/pos";
                }, 3000);
            } else {
                alert(data.error || "Failed to activate account.");
            }
        } catch {
            alert("Network error.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white/50 font-mono tracking-widest text-xs uppercase">
                Verifying Invitation...
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <h1 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-2">Invalid Invite</h1>
                <p className="text-sm text-white/40 max-w-xs">{error}</p>
                <button onClick={() => router.push("/login")} className="mt-8 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest">Back to login</button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 relative z-10"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-4">Account Ready!</h1>
                <p className="text-sm text-white/40 max-w-xs">Template activated. Redirecting you to your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center p-6">
            <div className="absolute inset-0 z-0 opacity-20">
                <FloatingLines
                    linesGradient={["#3b82f6", "#15319d", "#3b82f6"]}
                    animationSpeed={0.5}
                />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/50 backdrop-blur-3xl p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <div className="mb-8">
                        <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">
                            New Staff Account
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">
                            Welcome, <span className="text-blue-400">{user?.name}</span>
                        </h1>
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                            Position: {user?.role}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 block px-1">Create Password</label>
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-6 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 block px-1">Confirm Password</label>
                                <input
                                    required
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-6 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10"
                                    placeholder="••••••••"
                                />
                                <p className="mt-3 text-[9px] text-white/20 leading-relaxed px-1">
                                    Must be at least 8 characters long. Avoid using simple or common phrases.
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-14 rounded-2xl bg-blue-600 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 relative overflow-hidden group/btn"
                        >
                            <span className="relative z-10">{submitting ? "Activating..." : "Activate My Account"}</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
