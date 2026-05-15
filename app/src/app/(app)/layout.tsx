"use client";

import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </SessionProvider>
  );
}
