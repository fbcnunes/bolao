"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type UserStatus = "PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO";
type MemberStatus = "PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO";
type MemberRole = "ADMIN" | "PARTICIPANTE";
type BolaoStatus = "PENDENTE" | "ATIVO" | "RECUSADO";
type MatchStatus = "AGENDADO" | "AO_VIVO" | "ENCERRADO";
type PredictionResult = "CASA" | "EMPATE" | "FORA";

type User = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: string;
  createdAt: string;
  bolaoMembers: Array<{
    role: MemberRole;
    status: MemberStatus;
    bolao: {
      id: string;
      nome: string;
      status: BolaoStatus;
    };
  }>;
};

type Bolao = {
  id: string;
  nome: string;
  status: BolaoStatus;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  _count: { members: number };
};

type MasterMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  dateTime: string;
  status: MatchStatus;
  result: PredictionResult | null;
  phase: string;
  round: number;
  odds: Array<{
    id: string;
    oddHome: number;
    oddDraw: number;
    oddAway: number;
    favorite: PredictionResult;
    capturedAt: string;
  }>;
};

type RankingEntry = {
  user: { id: string; name: string };
  totalPoints: number;
  correctPredictions: number;
};

type Tab = "dashboard" | "boloes" | "usuarios" | "jogos";

const statusConfig = {
  PENDENTE: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  ATIVO:    { label: "Ativo",    class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  RECUSADO: { label: "Recusado", class: "bg-red-500/10 text-red-400 border border-red-500/20" },
  REMOVIDO: { label: "Removido", class: "bg-slate-500/10 text-slate-300 border border-slate-500/20" },
};

function SyncButton({
  loading,
  onClick,
  label = "Sincronizar base",
}: {
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(16, 185, 129, 0.12))", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/15 text-brand-primary">
        <span className={`absolute h-7 w-7 rounded-lg border border-brand-primary/30 ${loading ? "animate-ping" : ""}`} />
        <svg className={`relative h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.3 3.7L4 6m0 9a8 8 0 0013.7 5.3L20 18" />
        </svg>
      </span>
      <span>{loading ? "Sincronizando..." : label}</span>
    </button>
  );
}

export default function MasterPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bolões
  const [boloes, setBoloes] = useState<Bolao[]>([]);
  const [baloesLoading, setBaloesLoading] = useState(true);
  const [bolaoFilter, setBolaoFilter] = useState<"TODOS" | "PENDENTE" | "ATIVO" | "RECUSADO">("PENDENTE");
  const [dashboardBolaoId, setDashboardBolaoId] = useState<string | null>(null);
  const [dashboardRanking, setDashboardRanking] = useState<RankingEntry[]>([]);
  const [dashboardRankingLoading, setDashboardRankingLoading] = useState(false);

  // Usuários
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter, setUserFilter] = useState<"TODOS" | "PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO">("PENDENTE");

  // Jogos
  const [matches, setMatches] = useState<MasterMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchFilter, setMatchFilter] = useState<"AGENDADO" | "AO_VIVO" | "ENCERRADO" | "TODOS">("AGENDADO");
  const [editing, setEditing] = useState<{ matchId: string; status: MatchStatus; result: PredictionResult | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculatingBonus, setCalculatingBonus] = useState(false);
  const [syncingOdds, setSyncingOdds] = useState(false);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchBoloes = useCallback(async () => {
    setBaloesLoading(true);
    try {
      const res = await fetch("/api/master/boloes");
      const d = await res.json();
      const list = Array.isArray(d) ? d : [];
      setBoloes(list);
      return true;
    } catch {
      return false;
    } finally {
      setBaloesLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/master/users");
      const d = await res.json();
      setUsers(Array.isArray(d) ? d : []);
      return true;
    } catch {
      return false;
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(() => {
    setMatchesLoading(true);
    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((d) => setMatches(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchBoloes();
      fetchUsers();
    });
  }, [fetchBoloes, fetchUsers]);

  useEffect(() => {
    if (tab === "jogos" && matches.length === 0) {
      void Promise.resolve().then(fetchMatches);
    }
  }, [tab, matches.length, fetchMatches]);

  const handleBolaoAction = async (bolaoId: string, action: "approve" | "reject") => {
    setActionLoading(bolaoId);
    try {
      const res = await fetch(`/api/master/boloes/${bolaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", data.message); void fetchBoloes(); }
      else showMsg("error", data.message);
    } catch {
      showMsg("error", "Erro ao processar ação.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserAction = async (userId: string, action: "approve" | "reject" | "reactivate") => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { showMsg("success", data.message); void fetchUsers(); }
      else showMsg("error", data.message);
    } catch {
      showMsg("error", "Erro ao realizar ação.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCalculateBonus = async () => {
    setCalculatingBonus(true);
    try {
      const res = await fetch("/api/admin/bonuses", { method: "POST" });
      const data = await res.json();
      if (res.ok) showMsg("success", `Bônus recalculados! ${data.bonusAwarded} bônus atribuído(s).`);
      else showMsg("error", data.message || "Erro ao calcular bônus.");
    } catch {
      showMsg("error", "Erro ao calcular bônus.");
    } finally {
      setCalculatingBonus(false);
    }
  };

  const handleSyncOdds = async () => {
    setSyncingOdds(true);
    try {
      const res = await fetch("/api/admin/odds/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", `Odds atualizadas! ${data.syncedCount} jogo(s) sincronizado(s), ${data.skippedCount} ignorado(s).`);
        fetchMatches();
      } else {
        showMsg("error", data.message || "Erro ao atualizar odds.");
      }
    } catch {
      showMsg("error", "Erro ao atualizar odds.");
    } finally {
      setSyncingOdds(false);
    }
  };

  const handleSaveResult = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: editing.matchId, status: editing.status, result: editing.result }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", `${data.message} (${data.predictionsProcessed} palpites processados)`);
        setEditing(null);
        fetchMatches();
      } else showMsg("error", data.message);
    } catch {
      showMsg("error", "Erro ao salvar resultado.");
    } finally {
      setSaving(false);
    }
  };

  const handleDashboardBolaoClick = async (bolaoId: string) => {
    setDashboardBolaoId(bolaoId);
    setDashboardRankingLoading(true);
    try {
      const res = await fetch(`/api/ranking?bolaoId=${bolaoId}`);
      const data = await res.json();
      if (res.ok) {
        setDashboardRanking(Array.isArray(data) ? data : []);
      } else {
        setDashboardRanking([]);
        showMsg("error", data.message || "Erro ao buscar ranking.");
      }
    } catch {
      setDashboardRanking([]);
      showMsg("error", "Erro ao buscar ranking.");
    } finally {
      setDashboardRankingLoading(false);
    }
  };

  const handleSyncBoloes = async () => {
    const ok = await fetchBoloes();
    showMsg(ok ? "success" : "error", ok ? "Bolões sincronizados com a base." : "Erro ao sincronizar bolões.");
  };

  const handleSyncUsers = async () => {
    const ok = await fetchUsers();
    showMsg(ok ? "success" : "error", ok ? "Usuários sincronizados com a base." : "Erro ao sincronizar usuários.");
  };

  const pendingBoloes = boloes.filter((b) => b.status === "PENDENTE").length;
  const boloesAtivos = boloes.filter((b) => b.status === "ATIVO");
  const totalParticipantes = boloesAtivos.reduce((sum, b) => sum + b._count.members, 0);
  const pendingUsers = users.filter((u) => u.status === "PENDENTE").length;
  const filteredBoloes = boloes.filter((b) => bolaoFilter === "TODOS" ? true : b.status === bolaoFilter);
  const filteredUsers = users.filter((u) => userFilter === "TODOS" ? true : u.status === userFilter);
  const filteredMatches = matches.filter((m) => matchFilter === "TODOS" ? true : m.status === matchFilter);
  const dashboardBolao = boloesAtivos.find((b) => b.id === dashboardBolaoId) ?? null;
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "boloes",    label: "Bolões",   badge: pendingBoloes },
    { key: "usuarios",  label: "Usuários", badge: pendingUsers },
    { key: "jogos",     label: "Jogos" },
  ];

  return (
    <div className="min-h-screen">
      <TopBar title="Painel Master" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${tab === t.key ? "bg-brand-primary text-white" : ""}`}
              style={tab !== t.key ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
            >
              {t.label}
              {t.badge ? (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-400"}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Toast */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Modal resultado */}
        {editing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-24">
            <div className="rounded-2xl p-5 w-full max-w-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <h3 className="font-bold mb-4 text-center" style={{ color: "var(--text-primary)" }}>Definir Resultado</h3>
              <div className="mb-4">
                <p className="text-xs mb-2 text-center" style={{ color: "var(--text-muted)" }}>Status do jogo</p>
                <div className="flex gap-2">
                  {(["AGENDADO", "AO_VIVO", "ENCERRADO"] as const).map((s) => (
                    <button key={s} onClick={() => setEditing((e) => e ? { ...e, status: s, result: s !== "ENCERRADO" ? null : e.result } : e)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer ${editing.status === s ? "bg-brand-primary text-white" : ""}`}
                      style={editing.status !== s ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
                      {s === "AGENDADO" ? "Agendado" : s === "AO_VIVO" ? "Ao Vivo" : "Encerrado"}
                    </button>
                  ))}
                </div>
              </div>
              {editing.status === "ENCERRADO" && (
                <div className="mb-5">
                  <p className="text-xs mb-2 text-center" style={{ color: "var(--text-muted)" }}>Resultado</p>
                  <div className="flex gap-2">
                    {(["CASA", "EMPATE", "FORA"] as const).map((r) => (
                      <button key={r} onClick={() => setEditing((e) => e ? { ...e, result: r } : e)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer ${editing.result === r ? "bg-brand-primary text-white" : ""}`}
                        style={editing.result !== r ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
                        {r === "CASA" ? "Casa" : r === "EMPATE" ? "Empate" : "Fora"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer" style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>Cancelar</button>
                <button onClick={handleSaveResult} disabled={saving || (editing.status === "ENCERRADO" && !editing.result)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-primary text-white cursor-pointer disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 border col-span-1" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{boloesAtivos.length}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Bolões ativos</p>
              </div>
              <div className="rounded-2xl p-4 border col-span-1" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{totalParticipantes}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Participantes (total)</p>
              </div>
              {pendingBoloes > 0 && (
                <div className="rounded-2xl p-4 border col-span-1 bg-amber-500/5 border-amber-500/20 cursor-pointer" onClick={() => { setTab("boloes"); setBolaoFilter("PENDENTE"); }}>
                  <p className="text-3xl font-bold text-amber-400">{pendingBoloes}</p>
                  <p className="text-xs mt-1 text-amber-400/70">Bolões aguardando aprovação</p>
                </div>
              )}
              {pendingUsers > 0 && (
                <div className="rounded-2xl p-4 border col-span-1 bg-amber-500/5 border-amber-500/20 cursor-pointer" onClick={() => { setTab("usuarios"); setUserFilter("PENDENTE"); }}>
                  <p className="text-3xl font-bold text-amber-400">{pendingUsers}</p>
                  <p className="text-xs mt-1 text-amber-400/70">Usuários pendentes</p>
                </div>
              )}
            </div>

            {/* Participantes por bolão */}
            {boloesAtivos.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Participantes por bolão</p>
                <div className="space-y-2">
                  {boloesAtivos.map((b) => {
                    const pct = totalParticipantes > 0 ? (b._count.members / totalParticipantes) * 100 : 0;
                    const isSelected = dashboardBolaoId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleDashboardBolaoClick(b.id)}
                        className={`w-full text-left rounded-xl p-3 border cursor-pointer transition-all active:scale-[0.98] ${isSelected ? "border-brand-primary/50 bg-brand-primary/5" : ""}`}
                        style={!isSelected ? { background: "var(--bg-card)", borderColor: "var(--border-base)" } : {}}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-semibold truncate ${isSelected ? "text-brand-primary" : ""}`} style={!isSelected ? { color: "var(--text-primary)" } : {}}>{b.nome}</span>
                          <span className="text-sm font-bold ml-2 flex-shrink-0" style={{ color: "var(--text-primary)" }}>{b._count.members}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card2)" }}>
                          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {dashboardBolao && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Ranking · {dashboardBolao.nome}
                  </p>
                  <button
                    onClick={() => {
                      setDashboardBolaoId(null);
                      setDashboardRanking([]);
                    }}
                    className="text-xs font-semibold cursor-pointer hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Fechar
                  </button>
                </div>

                {dashboardRankingLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 rounded-xl" style={{ background: "var(--bg-card)" }} />
                    ))}
                  </div>
                ) : dashboardRanking.length === 0 ? (
                  <div className="rounded-2xl p-6 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum palpite pontuado neste bolão ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dashboardRanking.map((entry, idx) => {
                      const position = idx + 1;
                      return (
                        <div key={entry.user.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                          <span className={`w-6 text-center text-sm font-bold flex-shrink-0 ${
                            position === 1 ? "text-amber-400" :
                            position === 2 ? "text-slate-400" :
                            position === 3 ? "text-amber-700" : ""
                          }`} style={position > 3 ? { color: "var(--text-muted)" } : {}}>
                            {position}
                          </span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-card2)" }}>
                            <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>{entry.user.name[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{entry.user.name}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{entry.correctPredictions} acerto{entry.correctPredictions !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{entry.totalPoints.toFixed(1)}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>pontos</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {boloesAtivos.length === 0 && !baloesLoading && (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl mb-3">🏆</p>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum bolão ativo</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aprove os bolões pendentes para vê-los aqui.</p>
                {pendingBoloes > 0 && (
                  <button onClick={() => { setTab("boloes"); setBolaoFilter("PENDENTE"); }}
                    className="mt-3 text-xs font-semibold text-brand-primary cursor-pointer hover:opacity-70">
                    Ver bolões pendentes ({pendingBoloes})
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── BOLÕES ── */}
        {tab === "boloes" && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Bolões cadastrados</p>
              <SyncButton loading={baloesLoading} onClick={() => void handleSyncBoloes()} />
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["PENDENTE", "ATIVO", "RECUSADO", "TODOS"] as const).map((f) => (
                <button key={f} onClick={() => setBolaoFilter(f)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${bolaoFilter === f ? "bg-brand-primary text-white" : ""}`}
                  style={bolaoFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
                  {f === "TODOS" ? "Todos" : f === "PENDENTE" ? `Pendentes${pendingBoloes > 0 ? ` (${pendingBoloes})` : ""}` : f === "ATIVO" ? "Ativos" : "Recusados"}
                </button>
              ))}
            </div>

            {baloesLoading ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />)}</div>
            ) : filteredBoloes.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl mb-3">🏆</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum bolão nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBoloes.map((b) => {
                  const sc = statusConfig[b.status];
                  const isProcessing = actionLoading === b.id;
                  return (
                    <div key={b.id} className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.nome}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            por {b.createdBy.name} · {b._count.members} membro{b._count.members !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {format(new Date(b.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${sc.class}`}>{sc.label}</span>
                      </div>
                      {b.status === "PENDENTE" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleBolaoAction(b.id, "approve")} disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                            {isProcessing ? "..." : "✓ Aprovar"}
                          </button>
                          <button onClick={() => handleBolaoAction(b.id, "reject")} disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                            {isProcessing ? "..." : "✕ Recusar"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── USUÁRIOS ── */}
        {tab === "usuarios" && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Usuários cadastrados</p>
              <SyncButton loading={usersLoading} onClick={() => void handleSyncUsers()} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total",     value: users.length,                                     color: "" },
                { label: "Ativos",    value: users.filter((u) => u.status === "ATIVO").length,  color: "text-emerald-400" },
                { label: "Pendentes", value: pendingUsers,                                      color: "text-amber-400" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                  <p className={`text-2xl font-bold ${stat.color}`} style={!stat.color ? { color: "var(--text-primary)" } : {}}>{stat.value}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["PENDENTE", "ATIVO", "RECUSADO", "REMOVIDO", "TODOS"] as const).map((f) => (
                <button key={f} onClick={() => setUserFilter(f)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${userFilter === f ? "bg-brand-primary text-white" : ""}`}
                  style={userFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
                  {f === "TODOS" ? "Todos" : f === "PENDENTE" ? `Pendentes${pendingUsers > 0 ? ` (${pendingUsers})` : ""}` : f === "ATIVO" ? "Ativos" : f === "RECUSADO" ? "Recusados" : "Removidos"}
                </button>
              ))}
            </div>

            {usersLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />)}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl mb-3">👥</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum usuário nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const sc = statusConfig[user.status];
                  const isProcessing = actionLoading === user.id;
                  return (
                    <div key={user.id} className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-card2)" }}>
                            <span className="font-bold" style={{ color: "var(--text-primary)" }}>{user.name[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                            <p className="text-xs truncate max-w-[180px]" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${sc.class}`}>{sc.label}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-base)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                          Bolões deste usuário
                        </p>
                        {user.bolaoMembers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {user.bolaoMembers.map((membership) => {
                              const membershipStatus = statusConfig[membership.status];
                              return (
                                <span
                                  key={membership.bolao.id}
                                  className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${membershipStatus.class}`}
                                >
                                  <span className="truncate">{membership.bolao.nome}</span>
                                  {membership.role === "ADMIN" && <span className="text-[10px] opacity-80">Admin</span>}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Este usuário ainda não participa de nenhum bolão.
                          </p>
                        )}
                      </div>
                      {user.status === "PENDENTE" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleUserAction(user.id, "approve")} disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                            {isProcessing ? "..." : "✓ Aprovar"}
                          </button>
                          <button onClick={() => handleUserAction(user.id, "reject")} disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                            {isProcessing ? "..." : "✕ Recusar"}
                          </button>
                        </div>
                      )}
                      {user.status === "RECUSADO" && (
                        <div className="mt-3">
                          <button onClick={() => handleUserAction(user.id, "reactivate")} disabled={isProcessing}
                            className="w-full py-2 text-xs font-semibold rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                            {isProcessing ? "..." : "↺ Reativar"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── JOGOS ── */}
        {tab === "jogos" && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={handleSyncOdds} disabled={syncingOdds}
                className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-brand-primary/15 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className={`w-4 h-4 ${syncingOdds ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.3 3.7L4 6m0 9a8 8 0 0013.7 5.3L20 18" />
                </svg>
                {syncingOdds ? "Atualizando..." : "Atualizar odds"}
              </button>
              <button onClick={handleCalculateBonus} disabled={calculatingBonus}
                className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/30 hover:bg-brand-secondary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {calculatingBonus ? "Calculando..." : "Recalcular bônus"}
              </button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["AGENDADO", "AO_VIVO", "ENCERRADO", "TODOS"] as const).map((f) => (
                <button key={f} onClick={() => setMatchFilter(f)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${matchFilter === f ? "bg-brand-primary text-white" : ""}`}
                  style={matchFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
                  {f === "TODOS" ? "Todos" : f === "AGENDADO" ? "Agendados" : f === "AO_VIVO" ? "Ao Vivo" : "Encerrados"}
                </button>
              ))}
            </div>

            {matchesLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />)}</div>
            ) : filteredMatches.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl mb-3">⚽</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum jogo encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMatches.map((match) => {
                  const latestOdd = match.odds[0];
                  const oddItems = [
                    { key: "CASA" as const, label: "1", team: match.homeTeam, value: latestOdd?.oddHome },
                    { key: "EMPATE" as const, label: "X", team: "Empate", value: latestOdd?.oddDraw },
                    { key: "FORA" as const, label: "2", team: match.awayTeam, value: latestOdd?.oddAway },
                  ];

                  return (
                    <div key={match.id} className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          {match.phase.replace("_", " ")} · R{match.round}
                        </span>
                        {match.status === "AO_VIVO" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">● Ao Vivo</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                            {match.status === "AGENDADO" ? format(new Date(match.dateTime), "dd/MM · HH:mm", { locale: ptBR }) : "Encerrado"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <p className={`flex-1 text-sm font-bold text-center ${match.result === "CASA" ? "text-brand-primary" : ""}`} style={match.result !== "CASA" ? { color: "var(--text-primary)" } : {}}>{match.homeTeam}</p>
                        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>VS</span>
                        <p className={`flex-1 text-sm font-bold text-center ${match.result === "FORA" ? "text-brand-primary" : ""}`} style={match.result !== "FORA" ? { color: "var(--text-primary)" } : {}}>{match.awayTeam}</p>
                      </div>

                      <div className="mb-3 rounded-xl p-3 border" style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Odds atuais</p>
                          <p className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                            {latestOdd ? format(new Date(latestOdd.capturedAt), "dd/MM HH:mm", { locale: ptBR }) : "Sem odds"}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {oddItems.map((odd) => {
                            const isFavorite = latestOdd?.favorite === odd.key;
                            return (
                              <div
                                key={odd.key}
                                className={`min-w-0 rounded-lg border px-2 py-2 ${isFavorite ? "border-brand-secondary/50 bg-brand-secondary/10" : ""}`}
                                style={!isFavorite ? { borderColor: "var(--border-base)", background: "var(--bg-card)" } : {}}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{odd.label}</span>
                                  {isFavorite && <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary flex-shrink-0" />}
                                </div>
                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{odd.team}</p>
                                <p className="text-sm font-bold tabular-nums mt-1" style={{ color: "var(--text-primary)" }}>
                                  {odd.value ? odd.value.toFixed(2) : "-"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {match.result && (
                        <p className="text-center text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          Resultado: {match.result === "CASA" ? match.homeTeam : match.result === "FORA" ? match.awayTeam : "Empate"}
                        </p>
                      )}
                      <button
                        onClick={() => setEditing({ matchId: match.id, status: match.status !== "ENCERRADO" ? "ENCERRADO" : match.status, result: match.result })}
                        className="w-full py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer hover:opacity-70"
                        style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>
                        {match.status === "ENCERRADO" ? "Editar resultado" : "Definir resultado"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
