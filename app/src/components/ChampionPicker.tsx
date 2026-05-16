"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ChampionState = {
  championPick: string | null;
  isLocked: boolean;
  deadline: string | null;
};

export default function ChampionPicker({ teams }: { teams: string[] }) {
  const [state, setState] = useState<ChampionState | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/champion")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        if (!data.championPick && !data.isLocked) setExpanded(true);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? teams.filter((t) => t.toLowerCase().includes(q)) : teams;
  }, [teams, search]);

  const handlePick = async (team: string) => {
    if (state?.isLocked) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/champion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      if (res.ok) {
        setState((prev) => prev ? { ...prev, championPick: data.championPick } : prev);
        setMessage({ type: "success", text: `${data.championPick} salvo como seu campeão!` });
        setExpanded(false);
        setSearch("");
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao salvar." });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!state) return null;

  const deadlineLabel = state.deadline
    ? format(new Date(state.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="mb-4">
      <div
        className="rounded-2xl p-4 transition-all border"
        style={{
          background: "var(--bg-card)",
          borderColor: state.isLocked ? "var(--border-base)" : state.championPick ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.5)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Palpite do Campeão</p>
              {state.championPick ? (
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{state.championPick}</p>
              ) : (
                <p className="text-amber-400 text-sm font-medium">
                  {state.isLocked ? "Não registrado" : "Escolha seu campeão!"}
                </p>
              )}
              {deadlineLabel && !state.isLocked && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Prazo: {deadlineLabel}</p>
              )}
              {state.isLocked && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Competição iniciada — prazo encerrado</p>
              )}
            </div>
          </div>

          {!state.isLocked && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-all"
            >
              {expanded ? "Fechar" : state.championPick ? "Alterar" : "Escolher"}
            </button>
          )}
        </div>

        {message && (
          <div className={`mt-3 p-2 rounded-xl text-xs font-medium text-center ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {expanded && !state.isLocked && (
          <div className="mt-4">
            <div className="relative mb-3">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar time..."
                className="w-full text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none border focus:border-amber-500/50"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-base)" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {filtered.map((team) => (
                <button
                  key={team}
                  onClick={() => handlePick(team)}
                  disabled={saving}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer active:scale-95 disabled:opacity-50 border
                    ${state.championPick === team
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : ""}`}
                  style={state.championPick !== team ? { background: "var(--bg-card2)", color: "var(--text-secondary)", borderColor: "var(--border-base)" } : {}}
                >
                  {team}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-2 text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Nenhum time encontrado.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
