"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type User = {
  id: string;
  name: string;
  email: string;
  status: "PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO";
  role: string;
  createdAt: string;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  dateTime: string;
  status: "AGENDADO" | "AO_VIVO" | "ENCERRADO";
  result: "CASA" | "EMPATE" | "FORA" | null;
  phase: string;
  round: number;
};

const statusConfig = {
  PENDENTE: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  ATIVO: { label: "Ativo", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  RECUSADO: { label: "Recusado", class: "bg-red-500/10 text-red-400 border border-red-500/20" },
  REMOVIDO: { label: "Removido", class: "bg-slate-500/10 text-slate-300 border border-slate-500/20" },
};

type Tab = "usuarios" | "jogos";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("usuarios");

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<"TODOS" | "PENDENTE" | "ATIVO" | "RECUSADO">("PENDENTE");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchFilter, setMatchFilter] = useState<"AGENDADO" | "AO_VIVO" | "ENCERRADO" | "TODOS">("AGENDADO");
  const [editing, setEditing] = useState<{ matchId: string; status: Match["status"]; result: Match["result"] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculatingBonus, setCalculatingBonus] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const res = await fetch("/api/admin/matches");
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  useEffect(() => {
    if (tab === "jogos" && matches.length === 0) {
      void Promise.resolve().then(fetchMatches);
    }
  }, [fetchMatches, matches.length, tab]);

  const handleUserAction = async (userId: string, action: "approve" | "reject" | "reactivate") => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { showMessage("success", data.message); fetchUsers(); }
      else showMessage("error", data.message);
    } catch {
      showMessage("error", "Erro ao realizar ação.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCalculateBonus = async () => {
    setCalculatingBonus(true);
    try {
      const res = await fetch("/api/admin/bonuses", { method: "POST" });
      const data = await res.json();
      if (res.ok) showMessage("success", `Bônus recalculados! ${data.bonusAwarded} bônus atribuído(s).`);
      else showMessage("error", data.message || "Erro ao calcular bônus.");
    } catch {
      showMessage("error", "Erro ao calcular bônus.");
    } finally {
      setCalculatingBonus(false);
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
        showMessage("success", `${data.message} (${data.predictionsProcessed} palpites processados)`);
        setEditing(null);
        fetchMatches();
      } else {
        showMessage("error", data.message);
      }
    } catch {
      showMessage("error", "Erro ao salvar resultado.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => userFilter === "TODOS" ? true : u.status === userFilter);
  const filteredMatches = matches.filter((m) => matchFilter === "TODOS" ? true : m.status === matchFilter);
  const pendingCount = users.filter((u) => u.status === "PENDENTE").length;

  return (
    <div className="min-h-screen">
      <TopBar title="Painel Admin" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        {/* Main Tabs */}
        <div className="flex gap-2 mb-4">
          {(["usuarios", "jogos"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                tab === t ? "bg-brand-primary text-white" : ""
              }`}
              style={tab !== t ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
            >
              {t === "usuarios" ? `Usuários${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "Jogos"}
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

        {/* Edit Result Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-24">
            <div className="rounded-2xl p-5 w-full max-w-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <h3 className="font-bold mb-4 text-center" style={{ color: "var(--text-primary)" }}>Definir Resultado</h3>
              <div className="mb-4">
                <p className="text-xs mb-2 text-center" style={{ color: "var(--text-muted)" }}>Status do jogo</p>
                <div className="flex gap-2">
                  {(["AGENDADO", "AO_VIVO", "ENCERRADO"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditing((e) => e ? { ...e, status: s, result: s !== "ENCERRADO" ? null : e.result } : e)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                        editing.status === s ? "bg-brand-primary text-white" : ""
                      }`}
                      style={editing.status !== s ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                    >
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
                      <button
                        key={r}
                        onClick={() => setEditing((e) => e ? { ...e, result: r } : e)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                          editing.result === r ? "bg-brand-primary text-white" : ""
                        }`}
                        style={editing.result !== r ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                      >
                        {r === "CASA" ? "Casa" : r === "EMPATE" ? "Empate" : "Fora"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
                  style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveResult}
                  disabled={saving || (editing.status === "ENCERRADO" && !editing.result)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-primary text-white cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === "usuarios" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total", value: users.length, color: "" },
                { label: "Ativos", value: users.filter((u) => u.status === "ATIVO").length, color: "text-emerald-400" },
                { label: "Pendentes", value: pendingCount, color: "text-amber-400" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                  <p className={`text-2xl font-bold ${stat.color}`} style={!stat.color ? { color: "var(--text-primary)" } : {}}>{stat.value}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["PENDENTE", "ATIVO", "RECUSADO", "TODOS"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    userFilter === f ? "bg-brand-primary text-white" : ""
                  }`}
                  style={userFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                >
                  {f === "TODOS" ? "Todos" : f === "PENDENTE" ? `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f === "ATIVO" ? "Ativos" : "Recusados"}
                </button>
              ))}
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl p-4 animate-pulse border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full" style={{ background: "var(--bg-card2)" }}></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded w-2/3" style={{ background: "var(--bg-card2)" }}></div>
                        <div className="h-3 rounded w-1/2" style={{ background: "var(--bg-card2)" }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${sc.class}`}>
                          {sc.label}
                        </span>
                      </div>
                      {user.status === "PENDENTE" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleUserAction(user.id, "approve")}
                            disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing ? "..." : "✓ Aprovar"}
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, "reject")}
                            disabled={isProcessing}
                            className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing ? "..." : "✕ Recusar"}
                          </button>
                        </div>
                      )}
                      {user.status === "RECUSADO" && (
                        <div className="mt-3">
                          <button
                            onClick={() => handleUserAction(user.id, "reactivate")}
                            disabled={isProcessing}
                            className="w-full py-2 text-xs font-semibold rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
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

        {/* MATCHES TAB */}
        {tab === "jogos" && (
          <>
            <button
              onClick={handleCalculateBonus}
              disabled={calculatingBonus}
              className="w-full mb-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/30 hover:bg-brand-secondary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {calculatingBonus ? "Calculando..." : "Recalcular Bônus do Dia"}
            </button>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["AGENDADO", "AO_VIVO", "ENCERRADO", "TODOS"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMatchFilter(f)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    matchFilter === f ? "bg-brand-primary text-white" : ""
                  }`}
                  style={matchFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
                >
                  {f === "TODOS" ? "Todos" : f === "AGENDADO" ? "Agendados" : f === "AO_VIVO" ? "Ao Vivo" : "Encerrados"}
                </button>
              ))}
            </div>

            {matchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl p-4 animate-pulse border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                    <div className="h-4 rounded w-1/3 mb-2" style={{ background: "var(--bg-card2)" }}></div>
                    <div className="flex justify-between">
                      <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
                      <div className="h-5 rounded w-1/4" style={{ background: "var(--bg-card2)" }}></div>
                      <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-3xl mb-3">⚽</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum jogo encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {match.phase.replace("_", " ")} · R{match.round}
                      </span>
                      {match.status === "AO_VIVO" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">● Ao Vivo</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                          {match.status === "AGENDADO"
                            ? format(new Date(match.dateTime), "dd/MM · HH:mm", { locale: ptBR })
                            : "Encerrado"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className={`flex-1 text-sm font-bold text-center ${match.result === "CASA" ? "text-brand-primary" : ""}`} style={match.result !== "CASA" ? { color: "var(--text-primary)" } : {}}>
                        {match.homeTeam}
                      </p>
                      <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>VS</span>
                      <p className={`flex-1 text-sm font-bold text-center ${match.result === "FORA" ? "text-brand-primary" : ""}`} style={match.result !== "FORA" ? { color: "var(--text-primary)" } : {}}>
                        {match.awayTeam}
                      </p>
                    </div>
                    {match.result && (
                      <p className="text-center text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                        Resultado: {match.result === "CASA" ? match.homeTeam : match.result === "FORA" ? match.awayTeam : "Empate"}
                      </p>
                    )}
                    <button
                      onClick={() => setEditing({ matchId: match.id, status: match.status !== "ENCERRADO" ? "ENCERRADO" : match.status, result: match.result })}
                      className="w-full py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer hover:opacity-70"
                      style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}
                    >
                      {match.status === "ENCERRADO" ? "Editar resultado" : "Definir resultado"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
