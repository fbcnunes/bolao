"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ChampionState = {
  championPick: string | null;
  isLocked: boolean;
  deadline: string | null;
};

type ChampionPicksData = {
  predictionsVisible: boolean;
  deadline: string | null;
  summary?: {
    totalMembers: number;
    totalPredictions: number;
    missingPredictions: number;
    distribution: Array<{ team: string; count: number }>;
  };
  predictions?: Array<{
    userId: string;
    name: string;
    championPick: string | null;
    isMe: boolean;
  }>;
};

export default function ChampionPicker({ bolaoId, teams }: { bolaoId: string; teams: string[] }) {
  const [state, setState] = useState<ChampionState | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPicks, setShowPicks] = useState(false);
  const [picksData, setPicksData] = useState<ChampionPicksData | null>(null);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState("");

  useEffect(() => {
    fetch(`/api/user/champion?bolaoId=${bolaoId}`)
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        if (!data.championPick && !data.isLocked) setExpanded(true);
      })
      .catch(() => {});
  }, [bolaoId]);

  useEffect(() => {
    if (!showPicks) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPicks(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPicks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? teams.filter((t) => t.toLowerCase().includes(q)) : teams;
  }, [teams, search]);

  const openChampionPicks = async () => {
    setShowPicks(true);
    if (picksData || picksLoading) return;

    setPicksLoading(true);
    setPicksError("");

    try {
      const res = await fetch(`/api/boloes/${bolaoId}/champion-picks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao buscar palpites.");
      setPicksData(data);
    } catch (error) {
      setPicksError(error instanceof Error ? error.message : "Erro ao buscar palpites.");
    } finally {
      setPicksLoading(false);
    }
  };

  const handlePick = async (team: string) => {
    if (state?.isLocked) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/champion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bolaoId, team }),
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
        <div
          className="flex items-center justify-between rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60"
          onClick={() => void openChampionPicks()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void openChampionPicks();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Ver palpites de campeão dos participantes"
        >
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

          <div className="flex items-center gap-2">
            {!state.isLocked && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((v) => !v);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className="min-h-9 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-all"
              >
                {expanded ? "Fechar" : state.championPick ? "Alterar" : "Escolher"}
              </button>
            )}
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
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
          <div className="mt-4" onClick={(event) => event.stopPropagation()}>
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

      {showPicks && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPicks(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="champion-picks-title"
            className="w-full max-w-lg max-h-[85dvh] overflow-hidden rounded-t-3xl border border-b-0 shadow-2xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}
          >
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
            </div>

            <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border-base)" }}>
              <div>
                <h2 id="champion-picks-title" className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  Palpites de Campeão
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  Escolhas dos participantes deste bolão
                </p>
              </div>
              <button
                onClick={() => setShowPicks(false)}
                className="h-11 w-11 flex-shrink-0 rounded-full border flex items-center justify-center cursor-pointer transition-all active:scale-95"
                style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
                aria-label="Fechar palpites de campeão"
                autoFocus
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5" style={{ maxHeight: "calc(85dvh - 92px)" }}>
              {picksLoading ? (
                <div className="space-y-3" aria-label="Carregando palpites">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl" style={{ background: "var(--bg-card2)" }} />
                  ))}
                </div>
              ) : picksError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                  <p className="text-sm font-semibold text-red-400">{picksError}</p>
                  <button
                    onClick={() => {
                      setPicksData(null);
                      void openChampionPicks();
                    }}
                    className="mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold cursor-pointer"
                    style={{ background: "var(--bg-card2)", color: "var(--text-primary)" }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : picksData && !picksData.predictionsVisible ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--bg-card2)" }}>
                    <svg className="h-6 w-6" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6h12V7a4 4 0 00-8 0v4" />
                    </svg>
                  </div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Palpites ainda bloqueados</p>
                  <p className="mx-auto mt-1 max-w-xs text-sm" style={{ color: "var(--text-muted)" }}>
                    As escolhas dos participantes serão reveladas quando o prazo para escolher o campeão terminar.
                  </p>
                </div>
              ) : picksData?.summary && picksData.predictions ? (
                <div className="space-y-6">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Distribuição</h3>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {picksData.summary.totalPredictions}/{picksData.summary.totalMembers} palpites
                      </span>
                    </div>

                    {picksData.summary.distribution.length > 0 ? (
                      <div className="space-y-3">
                        {picksData.summary.distribution.map((item) => {
                          const percentage = picksData.summary!.totalPredictions > 0
                            ? Math.round((item.count / picksData.summary!.totalPredictions) * 100)
                            : 0;

                          return (
                            <div key={item.team}>
                              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>{item.team}</span>
                                <span className="flex-shrink-0 text-xs font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                  {percentage}% · {item.count}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-card2)" }}>
                                <div
                                  className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl p-4 text-center text-sm" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                        Nenhum palpite de campeão foi registrado.
                      </p>
                    )}

                    {picksData.summary.missingPredictions > 0 && (
                      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {picksData.summary.missingPredictions} participante{picksData.summary.missingPredictions !== 1 ? "s" : ""} sem palpite registrado.
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Participantes</h3>
                    <div className="space-y-2">
                      {picksData.predictions.map((item) => (
                        <div key={item.userId} className="flex min-h-14 items-center gap-3 rounded-xl border p-3" style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)" }}>
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand-primary/30 bg-brand-primary/20">
                            <span className="text-xs font-bold text-brand-primary">{item.name[0]?.toUpperCase() ?? "?"}</span>
                          </div>
                          <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${item.isMe ? "text-brand-primary" : ""}`} style={!item.isMe ? { color: "var(--text-primary)" } : {}}>
                            {item.name}
                            {item.isMe && <span className="font-normal" style={{ color: "var(--text-muted)" }}> (você)</span>}
                          </p>
                          <span
                            className="max-w-[42%] truncate rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            style={{
                              background: item.championPick ? "rgba(245,158,11,0.14)" : "var(--bg-card)",
                              color: item.championPick ? "#F59E0B" : "var(--text-muted)",
                            }}
                            title={item.championPick ?? "Sem palpite"}
                          >
                            {item.championPick ?? "Sem palpite"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
