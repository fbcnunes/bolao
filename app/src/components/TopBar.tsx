"use client";

import { useSession } from "next-auth/react";

export default function TopBar({ title }: { title: string }) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
            <span className="text-brand-primary text-sm font-bold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
