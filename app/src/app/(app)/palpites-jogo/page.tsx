"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useBolao } from "@/contexts/BolaoContext";

type PredictionResult = "CASA" | "EMPATE" | "FORA";
type MatchStatus = "AGENDADO" | "AO_VIVO" | "ENCERRADO";

type MatchOption = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  dateTime: string;
  status: MatchStatus;
  result?: PredictionResult | null;
  phase: string;
  round: number;
  group: string;
  predictionsVisible: boolean;
};

type MatchPrediction = MatchOption & {
  odds: {
    id: string;
    oddHome: number;
    oddDraw: number;
    oddAway: number;
    favorite: PredictionResult;
    capturedAt: string;
  }[];
  summary: {
    totalMembers: number;
    totalPredictions: number;
    missingPredictions: number;
    counts: Record<PredictionResult, number>;
  };
  predictions: {
    user: { id: string; name: string };
    prediction: PredictionResult | null;
    predictionLabel: string | null;
    correct: boolean | null;
    updatedAt: string | null;
  }[];
};

const GROUP_RESULT_OPTIONS: PredictionResult[] = ["CASA", "EMPATE", "FORA"];
const KNOCKOUT_RESULT_OPTIONS: PredictionResult[] = ["CASA", "EMPATE", "FORA"];
const OPTION_SHORT: Record<PredictionResult, string> = { CASA: "1", EMPATE: "X", FORA: "2" };
const STATUS_LABELS: Record<MatchStatus, string> = {
  AGENDADO: "Agendado",
  AO_VIVO: "Ao vivo",
  ENCERRADO: "Encerrado",
};

function getPickLabel(match: MatchOption, prediction: PredictionResult) {
  if (prediction === "CASA") return match.homeTeam;
  if (prediction === "FORA") return match.awayTeam;
  return "Empate";
}

function isKnockoutPhase(phase: string) {
  return phase !== "GRUPOS";
}

function getResultOptions(phase: string) {
  return isKnockoutPhase(phase) ? KNOCKOUT_RESULT_OPTIONS : GROUP_RESULT_OPTIONS;
}

function statusClass(status: MatchStatus) {
  if (status === "AO_VIVO") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (status === "ENCERRADO") return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/30";
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-28 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }} />
      <div className="h-56 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }} />
      <div className="h-40 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }} />
    </div>
  );
}

function DistributionBar({ match, option }: { match: MatchPrediction; option: PredictionResult }) {
  const count = match.summary.counts[option] ?? 0;
  const total = match.summary.totalPredictions;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const isResult = match.result === option;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${isResult ? "bg-brand-primary text-white" : ""}`} style={!isResult ? { background: "var(--bg-card2)", color: "var(--text-primary)" } : {}}>
            {OPTION_SHORT[option]}
          </span>
          <span className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>
            {getPickLabel(match, option)}
          </span>
        </div>
        <span className="font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-card2)" }}>
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MatchPredictionsCard({ match, currentUserId }: { match: MatchPrediction; currentUserId?: string }) {
  const latestOdd = match.odds[0];

  return (
    <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
      <div className="p-4 border-b" style={{ borderColor: "var(--border-base)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(match.status)}`}>
                {STATUS_LABELS[match.status]}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {match.group ? `Grupo ${match.group}` : match.phase}
              </span>
            </div>
            <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              {match.homeTeam} <span style={{ color: "var(--text-muted)" }}>x</span> {match.awayTeam}
            </h2>
            <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {format(new Date(match.dateTime), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {latestOdd && (
            <div className="flex-shrink-0 rounded-xl px-3 py-2 text-right" style={{ background: "var(--bg-card2)" }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Odds</p>
              <p className="text-xs font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {latestOdd.oddHome.toFixed(2)} / {latestOdd.oddDraw.toFixed(2)} / {latestOdd.oddAway.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {!match.predictionsVisible ? (
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card2)" }}>
            <svg className="w-5 h-5" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Palpites ainda bloqueados</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            As apostas dos participantes aparecem aqui quando o jogo começar.
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 border-b space-y-3" style={{ borderColor: "var(--border-base)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Distribuição</p>
              <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {match.summary.totalPredictions}/{match.summary.totalMembers} palpites
              </p>
            </div>
            {getResultOptions(match.phase).map((option) => (
              <DistributionBar key={option} match={match} option={option} />
            ))}
            {match.summary.missingPredictions > 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {match.summary.missingPredictions} participante{match.summary.missingPredictions !== 1 ? "s" : ""} sem palpite registrado.
              </p>
            )}
          </div>

          <div className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Participantes</p>
            <div className="space-y-2">
              {match.predictions.map((item) => {
                const isMe = item.user.id === currentUserId;
                const resultColor =
                  item.correct === true ? "text-emerald-400" : item.correct === false ? "text-red-400" : "";

                return (
                  <div key={item.user.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)" }}>
                    <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-primary text-xs font-bold">{item.user.name[0]?.toUpperCase() ?? "?"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isMe ? "text-brand-primary" : ""}`} style={!isMe ? { color: "var(--text-primary)" } : {}}>
                        {item.user.name}
                        {isMe && <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}> (você)</span>}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.updatedAt ? `Atualizado em ${format(new Date(item.updatedAt), "dd/MM HH:mm", { locale: ptBR })}` : "Sem palpite"}
                      </p>
                    </div>
                    {item.prediction ? (
                      <div className="text-right">
                        <p className={`text-sm font-bold ${resultColor}`} style={!resultColor ? { color: "var(--text-primary)" } : {}}>
                          {getPickLabel(match, item.prediction)}
                        </p>
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{OPTION_SHORT[item.prediction]}</p>
                      </div>
                    ) : (
                      <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                        Sem palpite
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function MatchPredictionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { activeBolao, loading: bolaoLoading } = useBolao();
  const [availableMatches, setAvailableMatches] = useState<MatchOption[]>([]);
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optionsScrollRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const selectedMatchId = searchParams.get("matchId");
  const activeBolaoId = activeBolao?.id;

  const fetchData = useCallback(async () => {
    if (!activeBolaoId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ bolaoId: activeBolaoId });
      if (selectedMatchId) params.set("matchId", selectedMatchId);

      const res = await fetch(`/api/matches/predictions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao buscar palpites.");
      }

      setAvailableMatches(Array.isArray(data.availableMatches) ? data.availableMatches : []);
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar palpites.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [activeBolaoId, selectedMatchId]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const chronological = [...availableMatches].sort((a, b) => {
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });

    if (!q) return chronological;

    return chronological.filter((match) =>
      match.homeTeam.toLowerCase().includes(q) ||
      match.awayTeam.toLowerCase().includes(q) ||
      match.group.toLowerCase().includes(q)
    );
  }, [availableMatches, search]);

  const scrollTargetMatchId = useMemo(() => {
    if (filteredOptions.length === 0) return null;

    if (selectedMatchId && filteredOptions.some((match) => match.id === selectedMatchId)) {
      return selectedMatchId;
    }

    if (search.trim()) {
      return filteredOptions[0].id;
    }

    const liveMatch = filteredOptions.find((match) => match.status === "AO_VIVO");
    if (liveMatch) return liveMatch.id;

    const nextMatch = filteredOptions.find((match) => {
      return match.status === "AGENDADO" && !match.predictionsVisible;
    });

    return nextMatch?.id ?? filteredOptions[0].id;
  }, [filteredOptions, search, selectedMatchId]);

  useEffect(() => {
    const container = optionsScrollRef.current;
    const target = scrollTargetMatchId ? optionRefs.current.get(scrollTargetMatchId) : null;

    if (!container || !target) return;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: Math.max(target.offsetTop - container.offsetTop, 0),
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scrollTargetMatchId, filteredOptions.length]);

  const handleSelectMatch = (matchId: string) => {
    router.replace(`/palpites-jogo?matchId=${matchId}`);
  };

  const handleShowLive = () => {
    router.replace("/palpites-jogo");
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Apostas do jogo" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        {bolaoLoading ? (
          <Skeleton />
        ) : !activeBolao ? (
          <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum bolão selecionado</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Selecione um bolão no topo para ver os palpites por jogo.</p>
          </div>
        ) : (
          <>
            <section className="mb-4 rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Filtro por jogo</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {selectedMatchId ? "Visualizando um jogo específico" : "Mostrando jogos ao vivo agora"}
                  </p>
                </div>
                {selectedMatchId && (
                  <button
                    onClick={handleShowLive}
                    className="h-9 rounded-xl border px-3 text-xs font-semibold cursor-pointer active:scale-95"
                    style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--color-brand-primary)" }}
                  >
                    Ao vivo
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por seleção, país ou grupo"
                  className="w-full text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-primary/50 border"
                  style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-base)" }}
                />
              </div>

              <div ref={optionsScrollRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {filteredOptions.length === 0 ? (
                  <p className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>Nenhum jogo encontrado.</p>
                ) : (
                  filteredOptions.map((match) => {
                    const active = selectedMatchId === match.id;
                    return (
                      <button
                        key={match.id}
                        ref={(node) => {
                          if (node) {
                            optionRefs.current.set(match.id, node);
                          } else {
                            optionRefs.current.delete(match.id);
                          }
                        }}
                        onClick={() => handleSelectMatch(match.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-all cursor-pointer active:scale-[0.99] ${active ? "border-brand-primary/60 bg-brand-primary/10" : ""}`}
                        style={!active ? { background: "var(--bg-card2)", borderColor: "var(--border-base)" } : {}}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {match.homeTeam} x {match.awayTeam}
                          </p>
                          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(match.status)}`}>
                            {STATUS_LABELS[match.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(match.dateTime), "dd/MM HH:mm", { locale: ptBR })}
                          {match.group ? ` · Grupo ${match.group}` : ""}
                          {!match.predictionsVisible ? " · palpites bloqueados" : ""}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {loading ? (
              <Skeleton />
            ) : error ? (
              <div className="rounded-2xl p-6 text-center border border-red-500/30 bg-red-500/10 text-red-400">
                {error}
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum jogo ao vivo agora</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Escolha outro jogo na lista acima para consultar os palpites quando estiverem liberados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <MatchPredictionsCard key={match.id} match={match} currentUserId={session?.user?.id} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
