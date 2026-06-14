"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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

function getMatchDayKey(dateTime: string) {
  return format(new Date(dateTime), "yyyy-MM-dd");
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  onSave,
  isLast,
}: {
  match: Match;
  onSave: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => Promise<void>;
  isLast: boolean;
}) {
  const latestOdd = match.odds[0];
  const existingPrediction = match.predictions[0];
  const isLocked = match.status !== "AGENDADO" || new Date() >= new Date(match.dateTime);
  const isCorrect = existingPrediction?.correct;

  const [saving, setSaving] = useState<"CASA" | "EMPATE" | "FORA" | null>(null);
  const [savedPick, setSavedPick] = useState<"CASA" | "EMPATE" | "FORA" | undefined>(existingPrediction?.prediction);
  const [flashError, setFlashError] = useState(false);

  useEffect(() => {
    setSavedPick(existingPrediction?.prediction);
  }, [existingPrediction?.prediction]);

  const currentPick = savedPick;

  const oddValues: Record<"CASA" | "EMPATE" | "FORA", number | undefined> = {
    CASA: latestOdd?.oddHome,
    EMPATE: latestOdd?.oddDraw,
    FORA: latestOdd?.oddAway,
  };

  const accentColor =
    isCorrect === true ? "#10B981" : isCorrect === false ? "rgba(239,68,68,0.6)" : "transparent";

  const handleClick = async (option: "CASA" | "EMPATE" | "FORA") => {
    if (isLocked || saving) return;
    setSaving(option);
    try {
      await onSave(match.id, option, latestOdd?.id ?? null);
      setSavedPick(option);
    } catch {
      setFlashError(true);
      setTimeout(() => setFlashError(false), 2000);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-2 py-2.5 border-l-2 pl-3"
        style={{ borderColor: flashError ? "rgba(239,68,68,0.6)" : accentColor }}
      >
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
            const isSavingThis = saving === option;

            let cls = "relative flex flex-col items-center justify-center w-10 h-10 rounded-lg text-[11px] font-bold transition-all duration-150 flex-shrink-0";
            if (isWrong) cls += " bg-red-500/15 text-red-400 ring-1 ring-red-500/30";
            else if (isSelected || isWinner) {
              cls += " bg-brand-primary text-white shadow-sm shadow-brand-primary/40";
              if (isWinner && !isSelected) cls += " ring-2 ring-brand-primary/40";
            }
            cls += isLocked ? " cursor-not-allowed opacity-70" : saving ? " cursor-wait" : " cursor-pointer active:scale-90";

            return (
              <button
                key={option}
                onClick={() => handleClick(option)}
                disabled={isLocked || !!saving}
                className={cls}
                style={!isWrong && !(isSelected || isWinner) ? { background: "var(--bg-card)", color: "var(--text-secondary)" } : {}}
              >
                {isFavorite && !isLocked && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-brand-secondary rounded-full" />
                )}
                {isSavingThis ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <span className="leading-none">{BTN_LABELS[option]}</span>
                    <span
                      className={`text-[9px] leading-none mt-0.5 ${isSelected && !isWrong ? "text-white/70" : ""}`}
                      style={!(isSelected && !isWrong) ? { color: "var(--text-muted)" } : {}}
                    >
                      {oddValues[option] ? oddValues[option]!.toFixed(2) : "—"}
                    </span>
                  </>
                )}
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
  onSave,
}: {
  date: string;
  matches: Match[];
  onSave: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => Promise<void>;
}) {
  const dayLabel = format(new Date(date + "T12:00:00"), "EEE, dd 'de' MMM", { locale: ptBR });
  const pickedCount = matches.filter((m) => m.predictions[0]).length;
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
          <div className="flex gap-0.5">
            {matches.map((m) => (
              <span
                key={m.id}
                className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                style={{ background: m.predictions[0] ? (allDone ? "#10B981" : "#F59E0B") : "var(--border-base)" }}
              />
            ))}
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
            onSave={onSave}
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
  const [loading, setLoading] = useState(true);
  const [autoFillError, setAutoFillError] = useState(false);

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

  const handleSave = useCallback(async (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => {
    const res = await fetch("/api/predictions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bolaoId: activeBolao?.id, predictions: [{ matchId, prediction, oddId }] }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Erro ao salvar.");
    }
    setMatches((prev) =>
      prev.map((m) =>
        m.id !== matchId
          ? m
          : { ...m, predictions: [{ prediction, correct: null }] }
      )
    );
  }, [activeBolao]);

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
      days.add(getMatchDayKey(m.dateTime));
    });
    return Array.from(days).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    return matches.filter((m) => {
      if (statusFilter === "agendados" && m.status === "ENCERRADO") return false;
      if (groupFilter && m.group !== groupFilter) return false;
      if (roundFilter !== null && `${m.phase}-${m.round}` !== roundFilter) return false;
      if (q && !m.homeTeam.toLowerCase().includes(q) && !m.awayTeam.toLowerCase().includes(q)) return false;
      if (dateFilter) {
        if (getMatchDayKey(m.dateTime) !== dateFilter) return false;
      }
      return true;
    });
  }, [matches, statusFilter, groupFilter, roundFilter, countrySearch, dateFilter]);

  const autoFillCount = useMemo(() => {
    const now = new Date();
    return filteredMatches.filter((m) => {
      const isLocked = m.status !== "AGENDADO" || now >= new Date(m.dateTime);
      return !isLocked && !m.predictions[0] && m.odds[0];
    }).length;
  }, [filteredMatches]);

  const handleAutoFill = useCallback(async () => {
    const now = new Date();
    const toFill = filteredMatches.filter((m) => {
      const isLocked = m.status !== "AGENDADO" || now >= new Date(m.dateTime);
      return !isLocked && !m.predictions[0] && m.odds[0];
    });
    if (toFill.length === 0) return;

    const res = await fetch("/api/predictions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bolaoId: activeBolao?.id,
        predictions: toFill.map((m) => ({
          matchId: m.id,
          prediction: m.odds[0].favorite,
          oddId: m.odds[0].id,
        })),
      }),
    });
    if (res.ok) {
      setMatches((prev) =>
        prev.map((m) => {
          const fill = toFill.find((f) => f.id === m.id);
          if (!fill) return m;
          return { ...m, predictions: [{ prediction: fill.odds[0].favorite, correct: null }] };
        })
      );
    } else {
      setAutoFillError(true);
      setTimeout(() => setAutoFillError(false), 4000);
    }
  }, [activeBolao, filteredMatches]);

  const matchesByDay = useMemo(() => {
    const acc: Record<string, Match[]> = {};
    filteredMatches.forEach((m) => {
      const key = getMatchDayKey(m.dateTime);
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
    });
    return acc;
  }, [filteredMatches]);
  const sortedDays = Object.keys(matchesByDay).sort();

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

      {autoFillError && (
        <div className="mb-3 p-3 rounded-xl text-sm font-medium text-center bg-red-500/15 border border-red-500/30 text-red-400">
          Erro ao salvar palpites automáticos. Nenhum palpite foi registrado.
        </div>
      )}

      <Link
        href="/palpites-jogo"
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all active:scale-[0.99]"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ver apostas por jogo</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>Compare como os participantes apostaram nos jogos já iniciados.</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-primary/15 text-brand-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

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
              onSave={handleSave}
            />
          ))
        )}
      </div>
    </>
  );
}
