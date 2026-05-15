"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  odds: Odd[];
  predictions: Prediction[];
};

const RESULT_LABELS = { CASA: "Casa", EMPATE: "Empate", FORA: "Fora" };
const RESULT_OPTIONS: ("CASA" | "EMPATE" | "FORA")[] = ["CASA", "EMPATE", "FORA"];

function MatchCard({
  match,
  selectedPrediction,
  onSelect,
}: {
  match: Match;
  selectedPrediction?: "CASA" | "EMPATE" | "FORA";
  onSelect: (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string) => void;
}) {
  const latestOdd = match.odds[0];
  const existingPrediction = match.predictions[0];
  const isLocked = match.status !== "AGENDADO";
  const currentPick = selectedPrediction || existingPrediction?.prediction;
  const isCorrect = existingPrediction?.correct;

  const oddValues: Record<"CASA" | "EMPATE" | "FORA", number | undefined> = {
    CASA: latestOdd?.oddHome,
    EMPATE: latestOdd?.oddDraw,
    FORA: latestOdd?.oddAway,
  };

  const statusColors: Record<Match["status"], string> = {
    AGENDADO: "bg-slate-700/50 text-slate-300",
    AO_VIVO: "bg-red-500/20 text-red-400 animate-pulse",
    ENCERRADO: "bg-slate-800 text-slate-500",
  };
  const statusLabels: Record<Match["status"], string> = {
    AGENDADO: format(new Date(match.dateTime), "dd/MM · HH:mm", { locale: ptBR }),
    AO_VIVO: "● Ao Vivo",
    ENCERRADO: "Encerrado",
  };

  return (
    <div className={`glass-card rounded-2xl p-4 transition-all duration-300 ${isCorrect === true ? "border-brand-primary/50" : isCorrect === false ? "border-red-500/30" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{match.phase.replace("_", " ")}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[match.status]}`}>
          {statusLabels[match.status]}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-1 text-center">
          <p className="font-bold text-white text-base leading-tight">{match.homeTeam}</p>
          {match.result === "CASA" && <span className="text-xs text-brand-primary font-semibold">Vencedor</span>}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-slate-500 text-xs font-bold">VS</span>
          {match.status === "ENCERRADO" && (
            <span className="text-[10px] text-slate-600">
              {match.result === "EMPATE" ? "Empate" : ""}
            </span>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-white text-base leading-tight">{match.awayTeam}</p>
          {match.result === "FORA" && <span className="text-xs text-brand-primary font-semibold">Vencedor</span>}
        </div>
      </div>

      {/* Prediction Buttons */}
      {latestOdd && (
        <div className="grid grid-cols-3 gap-2">
          {RESULT_OPTIONS.map((option) => {
            const isSelected = currentPick === option;
            const isWinner = match.status === "ENCERRADO" && match.result === option;
            const isWrong = isLocked && isSelected && match.result && match.result !== option;
            const isFavorite = latestOdd.favorite === option;

            return (
              <button
                key={option}
                onClick={() => !isLocked && latestOdd && onSelect(match.id, option, latestOdd.id)}
                disabled={isLocked}
                className={`
                  relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer
                  ${isSelected && !isWrong ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105" : ""}
                  ${isWinner ? "bg-brand-primary text-white ring-2 ring-brand-primary/50" : ""}
                  ${isWrong ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30" : ""}
                  ${!isSelected && !isWinner && !isWrong ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60" : ""}
                  ${isLocked ? "cursor-not-allowed opacity-80" : "active:scale-95"}
                `}
              >
                {isFavorite && !isLocked && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-secondary rounded-full"></span>
                )}
                <span>{RESULT_LABELS[option]}</span>
                {oddValues[option] && (
                  <span className={`text-[10px] mt-0.5 ${isSelected && !isWrong ? "text-white/80" : "text-slate-500"}`}>
                    {oddValues[option]?.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!latestOdd && match.status === "AGENDADO" && (
        <div className="text-center text-xs text-slate-600 py-2">Odds não disponíveis</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [pending, setPending] = useState<Record<string, { prediction: "CASA" | "EMPATE" | "FORA"; oddId: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"todos" | "agendados">("agendados");

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

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSelect = (matchId: string, prediction: "CASA" | "EMPATE" | "FORA", oddId: string) => {
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
        matchId,
        prediction,
        oddId,
        oddTimestamp: new Date().toISOString(),
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
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao salvar palpites." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const filteredMatches = matches.filter((m) =>
    filter === "todos" ? true : m.status === "AGENDADO"
  );

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="min-h-screen">
      <TopBar title="Bolão Copa 2026" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(["agendados", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${filter === f ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "bg-slate-800/60 text-slate-400 hover:text-white"}`}
            >
              {f === "agendados" ? "Próximos" : "Todos"}
            </button>
          ))}
        </div>

        {/* Toast Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center transition-all ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Match List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-3"></div>
                <div className="flex justify-between mb-4">
                  <div className="h-5 bg-slate-700 rounded w-1/3"></div>
                  <div className="h-5 bg-slate-700 rounded w-1/4"></div>
                  <div className="h-5 bg-slate-700 rounded w-1/3"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-slate-700 rounded-xl"></div>
                  <div className="h-10 bg-slate-700 rounded-xl"></div>
                  <div className="h-10 bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">⚽</p>
            <p className="text-white font-semibold mb-1">Nenhum jogo encontrado</p>
            <p className="text-slate-500 text-sm">
              {filter === "agendados" ? "Não há jogos agendados no momento." : "O calendário ainda está sendo carregado."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                selectedPrediction={pending[match.id]?.prediction}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {/* Floating Save Button */}
        {pendingCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2 shadow-2xl shadow-brand-primary/40"
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
      </main>
    </div>
  );
}
