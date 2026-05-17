"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChampionPicker from "@/components/ChampionPicker";
import { useBolao } from "@/contexts/BolaoContext";

type Odd = {
  id: string;
  oddHome: number;
  oddDraw: number;
  oddAway: number;
  favorite: "CASA" | "EMPATE" | "FORA";
  capturedAt: string;
};

type Prediction = {
  prediction: "CASA" | "EMPATE" | "FORA";
  correct?: boolean | null;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  dateTime: string;
  status: "AGENDADO" | "AO_VIVO" | "ENCERRADO";
  result?: "CASA" | "EMPATE" | "FORA" | null;
  phase: string;
  round: number;
  group: string;
  odds: Odd[];
  predictions: Prediction[];
};

const RESULT_OPTIONS: ("CASA" | "EMPATE" | "FORA")[] = ["CASA", "EMPATE", "FORA"];
const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const BTN_LABELS: Record<"CASA" | "EMPATE" | "FORA", string> = { CASA: "1", EMPATE: "X", FORA: "2" };
const PHASE_ORDER = ["GRUPOS", "PLAYOFFS", "OITAVAS", "QUARTAS", "SEMI", "FINAL"];
const PHASE_LABELS: Record<string, string> = {
  GRUPOS: "Rodada", PLAYOFFS: "16 avos", OITAVAS: "Oitavas",
  QUARTAS: "Quartas", SEMI: "Semifinal", FINAL: "Final",
};

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  selectedPrediction,
  onSelect,
  isLast,
}: {
  match: Match;
  selectedPrediction?: "CASA" | "EMPATE" | "FORA";
  onSelect: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => void;
  isLast: boolean;
}) {
  const latestOdd = match.odds[0];
  const existingPrediction = match.predictions[0];
  const isLocked = match.status !== "AGENDADO" || new Date() >= new Date(match.dateTime);
  const currentPick = selectedPrediction || existingPrediction?.prediction;
  const isCorrect = existingPrediction?.correct;

  const oddValues: Record<"CASA" | "EMPATE" | "FORA", number | undefined> = {
    CASA: latestOdd?.oddHome,
    EMPATE: latestOdd?.oddDraw,
    FORA: latestOdd?.oddAway,
  };

  const accentColor =
    isCorrect === true ? "#10B981" : isCorrect === false ? "rgba(239,68,68,0.6)" : "transparent";

  return (
    <>
      <div className="flex items-center gap-2 py-2.5 border-l-2 pl-3" style={{ borderColor: accentColor }}>
        {/* Grupo */}
        <span className="text-[10px] font-bold uppercase w-5 flex-shrink-0 text-center" style={{ color: "var(--text-muted)" }}>
          {match.group}
        </span>

        {/* Teams + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`text-xs font-semibold truncate ${match.result === "CASA" ? "text-brand-primary" : ""}`}
              style={match.result !== "CASA" ? { color: "var(--text-primary)" } : {}}
            >
              {match.homeTeam}
            </span>
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>×</span>
            <span
              className={`text-xs font-semibold truncate ${match.result === "FORA" ? "text-brand-primary" : ""}`}
              style={match.result !== "FORA" ? { color: "var(--text-secondary)" } : {}}
            >
              {match.awayTeam}
            </span>
          </div>
          <div className="mt-0.5">
            {match.status === "AO_VIVO" ? (
              <span className="text-[9px] font-bold text-red-400 animate-pulse">● Ao Vivo</span>
            ) : match.status === "ENCERRADO" ? (
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                Encerrado{match.result === "EMPATE" ? " · Empate" : ""}
              </span>
            ) : (
              <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {format(new Date(match.dateTime), "HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {RESULT_OPTIONS.map((option) => {
            const isSelected = currentPick === option;
            const isWinner = match.status === "ENCERRADO" && match.result === option;
            const isWrong = isLocked && isSelected && match.result && match.result !== option;
            const isFavorite = latestOdd?.favorite === option;

            let cls = "relative flex flex-col items-center justify-center w-10 h-10 rounded-lg text-[11px] font-bold transition-all duration-150 flex-shrink-0";
            if (isWrong) cls += " bg-red-500/15 text-red-400 ring-1 ring-red-500/30";
            else if (isSelected || isWinner) {
              cls += " bg-brand-primary text-white shadow-sm shadow-brand-primary/40";
              if (isWinner && !isSelected) cls += " ring-2 ring-brand-primary/40";
            }
            cls += isLocked ? " cursor-not-allowed opacity-70" : " cursor-pointer active:scale-90";

            return (
              <button
                key={option}
                onClick={() => !isLocked && onSelect(match.id, option, latestOdd?.id ?? null)}
                disabled={isLocked}
                className={cls}
                style={!isWrong && !(isSelected || isWinner) ? { background: "var(--bg-card)", color: "var(--text-secondary)" } : {}}
              >
                {isFavorite && !isLocked && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-brand-secondary rounded-full" />
                )}
                <span className="leading-none">{BTN_LABELS[option]}</span>
                <span
                  className={`text-[9px] leading-none mt-0.5 ${isSelected && !isWrong ? "text-white/70" : ""}`}
                  style={!(isSelected && !isWrong) ? { color: "var(--text-muted)" } : {}}
                >
                  {oddValues[option] ? oddValues[option]!.toFixed(2) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!isLast && <div className="h-px ml-9" style={{ background: "var(--border-base)" }} />}
    </>
  );
}

// ─── Day section with sticky header ──────────────────────────────────────────

function DaySection({
  date,
  matches,
  pending,
  onSelect,
}: {
  date: string;
  matches: Match[];
  pending: Record<string, { prediction: "CASA" | "EMPATE" | "FORA"; oddId: string | null }>;
  onSelect: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => void;
}) {
  const dayLabel = format(new Date(date + "T12:00:00"), "EEE, dd 'de' MMM", { locale: ptBR });
  const pickedCount = matches.filter((m) => pending[m.id] || m.predictions[0]).length;
  const total = matches.length;
  const allDone = pickedCount === total;

  return (
    <div>
      {/* Sticky day header */}
      <div
        className="sticky top-14 z-30 flex items-center justify-between px-4 py-1.5"
        style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-base)" }}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest capitalize" style={{ color: "var(--text-muted)" }}>
          {dayLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Dot indicators */}
          <div className="flex gap-0.5">
            {matches.map((m) => {
              const picked = pending[m.id] || m.predictions[0];
              return (
                <span
                  key={m.id}
                  className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                  style={{ background: picked ? (allDone ? "#10B981" : "#F59E0B") : "var(--border-base)" }}
                />
              );
            })}
          </div>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: allDone ? "#10B981" : "var(--text-muted)" }}>
            {pickedCount}/{total}
          </span>
        </div>
      </div>

      {/* Match rows */}
      <div className="px-4 py-1">
        {matches.map((match, idx) => (
          <MatchRow
            key={match.id}
            match={match}
            selectedPrediction={pending[match.id]?.prediction}
            onSelect={onSelect}
            isLast={idx === matches.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[5, 4, 3].map((count, ci) => (
        <div key={ci}>
          {/* sticky header skeleton */}
          <div className="flex items-center justify-between px-4 py-1.5 mb-1" style={{ borderBottom: "1px solid var(--border-base)" }}>
            <div className="h-2.5 w-32 rounded" style={{ background: "var(--border-base)" }} />
            <div className="h-2.5 w-10 rounded" style={{ background: "var(--border-base)" }} />
          </div>
          <div className="px-4 py-1">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 py-2.5 border-l-2 border-transparent pl-3">
                  <div className="w-5 h-3 rounded" style={{ background: "var(--border-base)" }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded" style={{ background: "var(--border-base)" }} />
                    <div className="h-2 w-1/5 rounded" style={{ background: "var(--border-base)" }} />
                  </div>
                  <div className="flex gap-1">
                    {[0,1,2].map(j => <div key={j} className="w-10 h-10 rounded-lg" style={{ background: "var(--border-base)" }} />)}
                  </div>
                </div>
                {i < count - 1 && <div className="h-px ml-9" style={{ background: "var(--border-base)" }} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeClient() {
  const { activeBolao } = useBolao();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pending, setPending] = useState<Record<string, { prediction: "CASA" | "EMPATE" | "FORA"; oddId: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<"todos" | "agendados">("agendados");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!activeBolao) return;

    try {
      const res = await fetch(`/api/matches?bolaoId=${activeBolao.id}`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeBolao]);

  useEffect(() => {
    void Promise.resolve().then(fetchMatches);
  }, [fetchMatches]);

  const handleSelect = (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => {
    setPending((prev) => ({ ...prev, [matchId]: { prediction, oddId } }));
  };

  const handleSaveAll = async () => {
    if (Object.keys(pending).length === 0) {
      setMessage({ type: "error", text: "Nenhum palpite novo para salvar." });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const predictions = Object.entries(pending).map(([matchId, { prediction, oddId }]) => ({
        matchId, prediction, oddId,
      }));
      const res = await fetch("/api/predictions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bolaoId: activeBolao?.id, predictions }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `${data.saved} palpite(s) salvo(s) com sucesso!` });
        setPending({});
        fetchMatches();
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao salvar." });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar palpites." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const clearFilters = () => {
    setGroupFilter(null);
    setRoundFilter(null);
    setCountrySearch("");
    setDateFilter(null);
  };

  const hasActiveFilters = groupFilter !== null || roundFilter !== null || countrySearch.trim() !== "" || dateFilter !== null;

  const availableRounds = useMemo(() => {
    const map = new Map<string, { phase: string; round: number; label: string }>();
    matches.forEach((m) => {
      const key = `${m.phase}-${m.round}`;
      if (!map.has(key)) {
        const label = m.phase === "GRUPOS" ? `Rodada ${m.round}` : PHASE_LABELS[m.phase] ?? m.phase;
        map.set(key, { phase: m.phase, round: m.round, label });
      }
    });
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const pa = PHASE_ORDER.indexOf(a.phase), pb = PHASE_ORDER.indexOf(b.phase);
      return pa !== pb ? pa - pb : a.round - b.round;
    });
  }, [matches]);

  const availableDates = useMemo(() => {
    const days = new Set<string>();
    matches.forEach((m) => {
      const local = new Date(new Date(m.dateTime).getTime() - 3 * 60 * 60 * 1000);
      days.add(format(local, "yyyy-MM-dd"));
    });
    return Array.from(days).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    return matches.filter((m) => {
      if (statusFilter === "agendados" && m.status !== "AGENDADO") return false;
      if (groupFilter && m.group !== groupFilter) return false;
      if (roundFilter !== null && `${m.phase}-${m.round}` !== roundFilter) return false;
      if (q && !m.homeTeam.toLowerCase().includes(q) && !m.awayTeam.toLowerCase().includes(q)) return false;
      if (dateFilter) {
        const local = format(new Date(new Date(m.dateTime).getTime() - 3 * 60 * 60 * 1000), "yyyy-MM-dd");
        if (local !== dateFilter) return false;
      }
      return true;
    });
  }, [matches, statusFilter, groupFilter, roundFilter, countrySearch, dateFilter]);

  const autoFillCount = useMemo(() => {
    const now = new Date();
    return filteredMatches.filter((m) => {
      const isLocked = m.status !== "AGENDADO" || now >= new Date(m.dateTime);
      return !isLocked && !m.predictions[0] && !pending[m.id] && m.odds[0];
    }).length;
  }, [filteredMatches, pending]);

  const handleAutoFill = () => {
    const now = new Date();
    setPending((prev) => {
      const next = { ...prev };
      filteredMatches.forEach((m) => {
        const isLocked = m.status !== "AGENDADO" || now >= new Date(m.dateTime);
        if (!isLocked && !m.predictions[0] && !prev[m.id] && m.odds[0]) {
          next[m.id] = { prediction: m.odds[0].favorite, oddId: m.odds[0].id };
        }
      });
      return next;
    });
  };

  const matchesByDay = useMemo(() => {
    const acc: Record<string, Match[]> = {};
    filteredMatches.forEach((m) => {
      const local = new Date(new Date(m.dateTime).getTime() - 3 * 60 * 60 * 1000);
      const key = format(local, "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
    });
    return acc;
  }, [filteredMatches]);
  const sortedDays = Object.keys(matchesByDay).sort();

  const pendingCount = Object.keys(pending).length;

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => { set.add(m.homeTeam); set.add(m.awayTeam); });
    return Array.from(set).sort();
  }, [matches]);

  return (
    <>
      {/* Champion picker and tabs have their own px-4 via page layout */}
      {activeBolao && allTeams.length > 0 && <ChampionPicker bolaoId={activeBolao.id} teams={allTeams} />}

      {/* Status tabs */}
      <div className="flex gap-2 mb-3">
        {(["agendados", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              statusFilter === f ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : ""
            }`}
            style={statusFilter !== f ? { background: "var(--bg-card)", color: "var(--text-secondary)" } : {}}
          >
            {f === "agendados" ? "Próximos" : "Todos"}
          </button>
        ))}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer relative ${
            showFilters || hasActiveFilters ? "bg-brand-primary text-white" : ""
          }`}
          style={!(showFilters || hasActiveFilters) ? { background: "var(--bg-card)", color: "var(--text-secondary)" } : {}}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
          </svg>
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-secondary rounded-full" />
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-2xl p-4 mb-4 space-y-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          <div>
            <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>País</label>
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Ex: Brasil, França..."
                className="w-full text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary/50 border"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-base)" }}
              />
              {countrySearch && (
                <button onClick={() => setCountrySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Grupo</label>
            <div className="flex flex-wrap gap-1.5">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(groupFilter === g ? null : g)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    groupFilter === g ? "bg-brand-primary text-white" : ""
                  }`}
                  style={groupFilter !== g ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {availableRounds.length > 0 && (
            <div>
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Rodada / Fase</label>
              <div className="flex flex-wrap gap-1.5">
                {availableRounds.map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setRoundFilter(roundFilter === key ? null : key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      roundFilter === key ? "bg-brand-primary text-white" : ""
                    }`}
                    style={roundFilter !== key ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Data</label>
            <div className="flex flex-wrap gap-1.5">
              {availableDates.map((d) => {
                const label = format(new Date(d + "T12:00:00"), "dd/MM");
                return (
                  <button
                    key={d}
                    onClick={() => setDateFilter(dateFilter === d ? null : d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      dateFilter === d ? "bg-brand-primary text-white" : ""
                    }`}
                    style={dateFilter !== d ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Palpite automático</label>
            <button
              onClick={handleAutoFill}
              disabled={autoFillCount === 0}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border ${
                autoFillCount > 0
                  ? "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/30 hover:bg-brand-secondary/25 cursor-pointer active:scale-95"
                  : "cursor-not-allowed"
              }`}
              style={autoFillCount === 0 ? { background: "var(--bg-card2)", color: "var(--text-muted)", borderColor: "var(--border-base)" } : {}}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {autoFillCount > 0
                ? `Marcar ${autoFillCount} jogo${autoFillCount > 1 ? "s" : ""} pelo favorito`
                : "Nenhum jogo disponível"}
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer hover:opacity-70"
              style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {message && (
        <div className={`mb-3 p-3 rounded-xl text-sm font-medium text-center ${
          message.type === "success"
            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            : "bg-red-500/15 border border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* List — negative mx to break out of page padding */}
      <div className="-mx-4">
        {loading ? (
          <Skeleton />
        ) : sortedDays.length === 0 ? (
          <div className="mx-4 rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <p className="text-4xl mb-3">⚽</p>
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum jogo encontrado</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {hasActiveFilters
                ? "Tente ajustar os filtros."
                : statusFilter === "agendados"
                ? "Não há jogos agendados no momento."
                : "O calendário ainda está sendo carregado."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs text-brand-primary cursor-pointer">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          sortedDays.map((day) => (
            <DaySection
              key={day}
              date={day}
              matches={matchesByDay[day]}
              pending={pending}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {pendingCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-brand-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-brand-primary/90 transition-all duration-200 shadow-2xl shadow-brand-primary/40 active:scale-95 w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar {pendingCount} palpite{pendingCount > 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
