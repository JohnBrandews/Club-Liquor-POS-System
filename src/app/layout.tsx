import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth/server";

const inter = Inter({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeonPOS",
  description: "Club & Liquor POS System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} antialiased min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]`}
      >
        {session ? (
          <div className="flex">
            <Sidebar user={session} />
            <main className="ml-64 min-h-dvh flex-1 overflow-x-hidden">
              <div className="p-1">
                {children}
              </div>
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
