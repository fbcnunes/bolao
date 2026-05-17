"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useBolao } from "@/contexts/BolaoContext";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => setMounted(true));
  }, []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
      style={{ background: "var(--bg-card2)", border: "1px solid var(--border-base)" }}
      aria-label="Alternar tema"
    >
      {isDark ? (
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function BolaoSelector() {
  const { boloes, activeBolao, setActiveBolao } = useBolao();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const ativos = boloes.filter((b) => b.status === "ATIVO");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (ativos.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 border max-w-[140px]"
        style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
      >
        <span className="truncate">{activeBolao?.nome ?? "Selecionar"}</span>
        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-xl shadow-xl border z-50 overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          {ativos.map((b) => (
            <button
              key={b.id}
              onClick={() => { setActiveBolao(b); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-all cursor-pointer hover:opacity-80 flex items-center justify-between gap-2 ${
                activeBolao?.id === b.id ? "text-brand-primary" : ""
              }`}
              style={activeBolao?.id !== b.id ? { color: "var(--text-primary)" } : {}}
            >
              <span className="truncate">{b.nome}</span>
              {activeBolao?.id === b.id && (
                <svg className="w-4 h-4 text-brand-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar({ title }: { title: string }) {
  const { data: session } = useSession();
  const isMaster = session?.user?.role === "MASTER";
  const identity = session?.user?.name || session?.user?.email || "Usuário";
  const initial = identity[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg" style={{ background: "var(--bg-topbar)", borderBottom: "1px solid var(--border-base)" }}>
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">⚽</span>
          <h1 className="text-lg font-bold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isMaster && <BolaoSelector />}
          <ThemeToggle />
          <div
            className="h-8 min-w-0 max-w-[124px] rounded-full pl-1 pr-2 border flex items-center gap-1.5"
            style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)" }}
            title={identity}
          >
            <div className="w-6 h-6 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-primary text-xs font-bold">
                {initial}
              </span>
            </div>
            <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {identity}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
