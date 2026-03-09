"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StaffUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    inviteToken?: string | null;
    createdAt: string;
};

export function StaffPageClient({ initialUsers }: { initialUsers: StaffUser[] }) {
    const router = useRouter();
    const [users, setUsers] = useState<StaffUser[]>(initialUsers);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editUser, setEditUser] = useState<StaffUser | null>(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("WAITER");

    function openEdit(u: StaffUser) {
        setEditUser(u);
        setName(u.name);
        setEmail(u.email);
        setPassword("");
        setRole(u.role);
    }

    async function toggleStatus(user: StaffUser) {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/staff/${user.id}/toggle`, { method: "POST" });
            if (res.ok) {
                setUsers(users.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update status");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, role }),
            });
            if (res.ok) {
                const data = await res.json();
                setUsers([...users, data.user]);
                setShowAddModal(false);
                resetForm();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add staff");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    }

    async function handleEditStaff(e: React.FormEvent) {
        e.preventDefault();
        if (!editUser) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/staff/${editUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password: password || undefined, role }),
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(users.map(u => u.id === editUser.id ? data.user : u));
                setEditUser(null);
                resetForm();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to edit staff");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    }

    async function handleSendDetails(user: StaffUser) {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/staff/${user.id}/resend-invite`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || "Link sent successfully!");
            } else {
                alert(data.error || "Failed to send details");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setName("");
        setEmail("");
        setPassword("");
        setRole("WAITER");
    }

    return (
        <div className="px-6 py-6">
            <div className="py-4">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold tracking-widest text-[color:var(--muted)] uppercase">
                            MANAGEMENT
                        </div>
                        <h1 className="text-2xl font-black text-white mt-1">Staff & Team</h1>
                        <p className="mt-1 text-xs text-[color:var(--muted)] font-medium uppercase tracking-tight">
                            Invite Admins, Managers, Bartenders, and Waiters.
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="h-10 w-full sm:w-auto rounded-xl bg-[color:var(--primary)] px-6 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 transition-all shadow-lg shadow-[color:var(--primary)]/20"
                    >
                        + Add Staff
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className={`relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-5 backdrop-blur-xl transition-all hover:border-[color:var(--primary)]/30 ${!u.isActive ? 'grayscale opacity-70' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-[color:var(--primary)] text-white flex items-center justify-center text-lg font-black shadow-lg shadow-[color:var(--primary)]/20">
                                    {u.name.charAt(0)}
                                </div>
                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                                    u.role === 'MANAGER' ? 'bg-blue-500/20 text-blue-300' :
                                        'bg-emerald-500/20 text-emerald-300'
                                    }`}>
                                    {u.role}
                                </div>
                            </div>

                            <div className="mt-4">
                                <h3 className="text-base font-bold text-white truncate">{u.name}</h3>
                                <p className="text-[10px] font-medium text-[color:var(--muted)] truncate">{u.email}</p>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                                <div className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-tighter">
                                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                                </div>
                                <div className={`text-[9px] font-black uppercase tracking-widest ${u.inviteToken ? 'text-amber-400' : u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {u.inviteToken ? 'Pending Invite' : u.isActive ? 'Active' : 'Dismissed'}
                                </div>
                            </div>

                            <div className="mt-5 flex gap-2">
                                <button
                                    onClick={() => toggleStatus(u)}
                                    disabled={loading || u.role === "ADMIN"}
                                    className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.role === "ADMIN"
                                        ? "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
                                        : u.isActive
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-200 hover:bg-red-500/20'
                                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20'
                                        }`}
                                >
                                    {u.role === "ADMIN" ? "Protected" : u.isActive ? 'Dismiss' : 'Reinstate'}
                                </button>
                                <button
                                    onClick={() => openEdit(u)}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all group/edit"
                                    title="Edit Details"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                <button
                                    onClick={() => handleSendDetails(u)}
                                    disabled={loading}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-200 transition-all group/send"
                                    title={u.inviteToken ? "Resend Invite" : "Send Reset Link"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Staff Modal */}
            {(showAddModal || editUser) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-[#1e293b] p-8 shadow-2xl">
                        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6">
                            {editUser ? 'Edit Details' : 'Register Staff'}
                        </h2>
                        <form onSubmit={editUser ? handleEditStaff : handleAddStaff} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Full Name</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--primary)] outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm focus:border-[color:var(--primary)] outline-none transition-all"
                                    placeholder="john@club.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-widest mb-1 block">Assigned Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-[#1e293b] border border-white/10 px-4 text-sm focus:border-[color:var(--primary)] outline-none transition-all appearance-none"
                                >
                                    <option value="WAITER">Waiter</option>
                                    <option value="BARTENDER">Bartender</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditUser(null); }}
                                    className="flex-1 h-11 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)] hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 h-11 rounded-xl bg-[color:var(--primary)] text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 transition-all shadow-lg shadow-[color:var(--primary)]/20 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : editUser ? 'Update Details' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
