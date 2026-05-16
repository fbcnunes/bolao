"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChampionPicker from "@/components/ChampionPicker";

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

const RESULT_LABELS = { CASA: "1", EMPATE: "Empate", FORA: "2" };
const RESULT_OPTIONS: ("CASA" | "EMPATE" | "FORA")[] = ["CASA", "EMPATE", "FORA"];
const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function MatchCard({
  match,
  selectedPrediction,
  onSelect,
}: {
  match: Match;
  selectedPrediction?: "CASA" | "EMPATE" | "FORA";
  onSelect: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => void;
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

  const statusLabels: Record<Match["status"], string> = {
    AGENDADO: format(new Date(match.dateTime), "HH:mm", { locale: ptBR }),
    AO_VIVO: "● Ao Vivo",
    ENCERRADO: "Encerrado",
  };

  const cardBorder = isCorrect === true
    ? "border-brand-primary/50"
    : isCorrect === false
    ? "border-red-500/30"
    : "";

  return (
    <div
      className={`backdrop-blur-md rounded-2xl p-4 transition-all duration-300 border ${cardBorder || ""}`}
      style={{ background: "var(--bg-card)", borderColor: cardBorder ? undefined : "var(--border-base)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Grupo {match.group}
        </span>
        {match.status === "AGENDADO" ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>
            {statusLabels[match.status]}
          </span>
        ) : match.status === "AO_VIVO" ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400 animate-pulse">
            {statusLabels[match.status]}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
            {statusLabels[match.status]}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-1 text-center">
          <p className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{match.homeTeam}</p>
          {match.result === "CASA" && <span className="text-xs text-brand-primary font-semibold">Vencedor</span>}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>VS</span>
          {match.status === "ENCERRADO" && match.result === "EMPATE" && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Empate</span>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{match.awayTeam}</p>
          {match.result === "FORA" && <span className="text-xs text-brand-primary font-semibold">Vencedor</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {RESULT_OPTIONS.map((option) => {
          const isSelected = currentPick === option;
          const isWinner = match.status === "ENCERRADO" && match.result === option;
          const isWrong = isLocked && isSelected && match.result && match.result !== option;
          const isFavorite = latestOdd?.favorite === option;

          let btnClass = "relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200";
          let btnStyle: React.CSSProperties = {};

          if (isWrong) {
            btnClass += " bg-red-500/20 text-red-400 ring-1 ring-red-500/30";
          } else if (isSelected || isWinner) {
            btnClass += " bg-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105";
            if (isWinner) btnClass += " ring-2 ring-brand-primary/50";
          } else {
            btnStyle = { background: "var(--bg-card2)", color: "var(--text-secondary)" };
          }

          if (isLocked) {
            btnClass += " cursor-not-allowed opacity-80";
          } else {
            btnClass += " cursor-pointer active:scale-95";
            if (!isSelected && !isWinner && !isWrong) btnClass += " hover:opacity-80";
          }

          return (
            <button
              key={option}
              onClick={() => !isLocked && onSelect(match.id, option, latestOdd?.id ?? null)}
              disabled={isLocked}
              className={btnClass}
              style={btnStyle}
            >
              {isFavorite && !isLocked && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-secondary rounded-full"></span>
              )}
              <span>{RESULT_LABELS[option]}</span>
              <span className={`text-[10px] mt-0.5 ${isSelected && !isWrong ? "text-white/80" : ""}`} style={!(isSelected && !isWrong) ? { color: "var(--text-muted)" } : {}}>
                {oddValues[option] ? oddValues[option]?.toFixed(2) : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayGroup({ date, matches, pending, onSelect }: {
  date: string;
  matches: Match[];
  pending: Record<string, { prediction: "CASA" | "EMPATE" | "FORA"; oddId: string | null }>;
  onSelect: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string | null) => void;
}) {
  const label = format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR });
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 px-1 capitalize" style={{ color: "var(--text-muted)" }}>
        {label}
      </h2>
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            selectedPrediction={pending[match.id]?.prediction}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeClient() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [pending, setPending] = useState<Record<string, { prediction: "CASA" | "EMPATE" | "FORA"; oddId: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"todos" | "agendados">("agendados");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<string | null>(null); // "{phase}-{round}"
  const [countrySearch, setCountrySearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

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
        body: JSON.stringify({ predictions }),
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

  const PHASE_ORDER = ["GRUPOS", "PLAYOFFS", "OITAVAS", "QUARTAS", "SEMI", "FINAL"];
  const PHASE_LABELS: Record<string, string> = {
    GRUPOS: "Rodada",
    PLAYOFFS: "16 avos",
    OITAVAS: "Oitavas",
    QUARTAS: "Quartas",
    SEMI: "Semifinal",
    FINAL: "Final",
  };

  const availableRounds = useMemo(() => {
    const map = new Map<string, { phase: string; round: number; label: string }>();
    matches.forEach((m) => {
      const key = `${m.phase}-${m.round}`;
      if (!map.has(key)) {
        const label = m.phase === "GRUPOS"
          ? `Rodada ${m.round}`
          : PHASE_LABELS[m.phase] ?? m.phase;
        map.set(key, { phase: m.phase, round: m.round, label });
      }
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => {
        const pa = PHASE_ORDER.indexOf(a.phase);
        const pb = PHASE_ORDER.indexOf(b.phase);
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
      {allTeams.length > 0 && <ChampionPicker teams={allTeams} />}

      {/* Status tabs */}
      <div className="flex gap-2 mb-3">
        {(["agendados", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              statusFilter === f ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : ""
            }`}
            style={statusFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
          >
            {f === "agendados" ? "Próximos" : "Todos"}
          </button>
        ))}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer relative
            ${showFilters || hasActiveFilters ? "bg-brand-primary text-white" : ""}`}
          style={!(showFilters || hasActiveFilters) ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
          </svg>
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-secondary rounded-full"></span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-2xl p-4 mb-4 space-y-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          {/* Country search */}
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

          {/* Group filter */}
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

          {/* Round filter */}
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

          {/* Date filter */}
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

          {/* Auto-fill button */}
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
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center transition-all ${
          message.type === "success"
            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            : "bg-red-500/15 border border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <div className="h-4 rounded w-1/3 mb-3" style={{ background: "var(--bg-card2)" }}></div>
              <div className="flex justify-between mb-4">
                <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
                <div className="h-5 rounded w-1/4" style={{ background: "var(--bg-card2)" }}></div>
                <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(j => <div key={j} className="h-10 rounded-xl" style={{ background: "var(--bg-card2)" }}></div>)}
              </div>
            </div>
          ))}
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          <p className="text-4xl mb-3">⚽</p>
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum jogo encontrado</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {hasActiveFilters ? "Tente ajustar os filtros." : statusFilter === "agendados" ? "Não há jogos agendados no momento." : "O calendário ainda está sendo carregado."}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs text-brand-primary cursor-pointer">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <DayGroup
              key={day}
              date={day}
              matches={matchesByDay[day]}
              pending={pending}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-brand-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-brand-primary/90 transition-all duration-200 shadow-lg shadow-brand-primary/30 active:scale-95 w-full flex items-center justify-center gap-2 shadow-2xl shadow-brand-primary/40"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
