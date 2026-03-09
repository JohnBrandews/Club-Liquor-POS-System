"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

export function AppLayoutContent({
    session,
    children
}: {
    session: any;
    children: React.ReactNode
}) {
    const pathname = usePathname();

    // Pages that should NEVER show the sidebar even if logged in
    const isPublicPage = pathname === "/login" || pathname === "/invite";

    // If no session or it's a public page, show plain children
    if (!session || isPublicPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex">
            <Sidebar user={session} />
            <main className="min-h-dvh flex-1 overflow-x-hidden md:ml-64">
                <div className="p-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
