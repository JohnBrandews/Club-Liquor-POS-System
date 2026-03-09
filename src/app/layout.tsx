import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth/server";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

// Use Inter as a replacement for Geist to fix the "Unknown font" error
const geist = Inter({
  variable: "--font-sans",
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

import { AppLayoutContent } from "@/components/AppLayoutContent";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${mono.variable} antialiased min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]`}
      >
        <AppLayoutContent session={session}>
          {children}
        </AppLayoutContent>
      </body>
    </html>
  );
}
