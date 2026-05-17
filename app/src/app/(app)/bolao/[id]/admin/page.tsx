"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { useParams } from "next/navigation";

type Member = {
  bolaoId: string;
  userId: string;
  role: "ADMIN" | "PARTICIPANTE";
  status: "PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO";
  user: { id: string; name: string; email: string };
};

type BolaoInviteSummary = {
  id: string;
  inviteCode: string;
};

const statusConfig = {
  PENDENTE: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  ATIVO: { label: "Ativo", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  RECUSADO: { label: "Recusado", class: "bg-red-500/10 text-red-400 border border-red-500/20" },
  REMOVIDO: { label: "Removido", class: "bg-slate-500/10 text-slate-300 border border-slate-500/20" },
};

export default function BolaoAdminPage() {
  const { id: bolaoId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<"PENDENTE" | "ATIVO" | "RECUSADO" | "REMOVIDO" | "TODOS">("PENDENTE");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [premiacaoRegra, setPremiacaoRegra] = useState("");
  const [savingPremiacao, setSavingPremiacao] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchMembers = useCallback(() => {
    setLoading(true);
    fetch(`/api/boloes/${bolaoId}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bolaoId]);

  // Busca o inviteCode do bolão via lista de bolões do usuário
  useEffect(() => {
    void Promise.resolve().then(() => setInviteCode(null));
    fetch("/api/boloes")
      .then((r) => r.json())
      .then((data: BolaoInviteSummary[]) => {
        const bolao = data?.find((b) => b.id === bolaoId);
        if (bolao) setInviteCode(bolao.inviteCode);
      })
      .catch(() => {});
  }, [bolaoId]);

  useEffect(() => {
    void Promise.resolve().then(fetchMembers);
  }, [fetchMembers]);

  useEffect(() => {
    void Promise.resolve().then(() => setPremiacaoRegra(""));
    fetch(`/api/boloes/${bolaoId}/settings`)
      .then((r) => r.json())
      .then((data) => setPremiacaoRegra(data?.premiacaoRegra ?? ""))
      .catch(() => {});
  }, [bolaoId]);

  useEffect(() => {
    void Promise.resolve().then(() => setOrigin(window.location.origin));
  }, []);

  const handleAction = async (userId: string, action: "approve" | "reject" | "remove" | "reactivate" | "makeAdmin") => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/boloes/${bolaoId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", data.message); fetchMembers(); }
      else showMsg("error", data.message);
    } catch {
      showMsg("error", "Erro ao realizar ação.");
    } finally {
      setActionLoading(null);
    }
  };

  const copyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inviteLink = inviteCode && origin
    ? `${origin}/entrar/${inviteCode}`
    : null;

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleSavePremiacao = async () => {
    setSavingPremiacao(true);
    try {
      const res = await fetch(`/api/boloes/${bolaoId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premiacaoRegra }),
      });
      const data = await res.json();
      if (res.ok) {
        setPremiacaoRegra(data.bolao?.premiacaoRegra ?? "");
        showMsg("success", data.message);
      } else {
        showMsg("error", data.message);
      }
    } catch {
      showMsg("error", "Erro ao salvar regra de premiação.");
    } finally {
      setSavingPremiacao(false);
    }
  };

  const pendingCount = members.filter((m) => m.status === "PENDENTE").length;
  const filtered = members.filter((m) => memberFilter === "TODOS" ? true : m.status === memberFilter);

  return (
    <div className="min-h-screen">
      <TopBar title="Admin do Bolão" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6">

        {/* Invite code */}
        {inviteCode && (
          <div className="mb-5 p-4 rounded-2xl border space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Código de convite</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm font-mono font-bold truncate" style={{ color: "var(--text-primary)" }}>{inviteCode}</code>
                <button
                  onClick={copyCode}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
                  style={{ background: "var(--bg-card2)", color: copied ? "var(--color-brand-primary)" : "var(--text-secondary)" }}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            {inviteLink && (
              <div className="pt-4 border-t" style={{ borderColor: "var(--border-base)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Link de convite</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xs font-mono truncate" style={{ color: "var(--text-primary)" }}>{inviteLink}</code>
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    style={{ background: "var(--bg-card2)", color: linkCopied ? "var(--color-brand-primary)" : "var(--text-secondary)" }}
                  >
                    {linkCopied ? "Copiado!" : "Copiar link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Premiação */}
        <div className="mb-5 p-4 rounded-2xl border space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Regra de premiação</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Informe como será a premiação deste bolão, incluindo valores, posições premiadas ou condições específicas.
            </p>
          </div>
          <textarea
            value={premiacaoRegra}
            onChange={(e) => setPremiacaoRegra(e.target.value)}
            maxLength={2000}
            rows={5}
            className="w-full rounded-xl border p-3 text-sm outline-none transition-all focus:border-brand-primary resize-y"
            style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            placeholder="Ex.: 1º lugar R$ 500, 2º lugar R$ 200, 3º lugar R$ 100. Em caso de empate, o valor será dividido entre os empatados."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{premiacaoRegra.length}/2000</span>
            <button
              onClick={handleSavePremiacao}
              disabled={savingPremiacao}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-primary text-white cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              {savingPremiacao ? "Salvando..." : "Salvar premiação"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Participantes deste bolão
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total no bolão", value: members.length, color: "" },
            { label: "Ativos no bolão", value: members.filter((m) => m.status === "ATIVO").length, color: "text-emerald-400" },
            { label: "Pendentes no bolão", value: pendingCount, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-3 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <p className={`text-2xl font-bold ${stat.color}`} style={!stat.color ? { color: "var(--text-primary)" } : {}}>{stat.value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
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

        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(["PENDENTE", "ATIVO", "RECUSADO", "REMOVIDO", "TODOS"] as const).map((f) => (
            <button key={f} onClick={() => setMemberFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${memberFilter === f ? "bg-brand-primary text-white" : ""}`}
              style={memberFilter !== f ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}>
              {f === "TODOS" ? "Todos" : f === "PENDENTE" ? `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f === "ATIVO" ? "Ativos" : f === "RECUSADO" ? "Recusados" : "Removidos"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full" style={{ background: "var(--bg-card2)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-2/3" style={{ background: "var(--bg-card2)" }} />
                  <div className="h-3 rounded w-1/2" style={{ background: "var(--bg-card2)" }} />
                </div>
              </div>
            </div>
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum membro nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => {
              const sc = statusConfig[m.status];
              const isProcessing = actionLoading === m.userId;
              return (
                <div key={m.userId} className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-card2)" }}>
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>{m.user.name[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                          {m.user.name}
                          {m.role === "ADMIN" && <span className="ml-1 text-[10px] text-brand-primary">(admin)</span>}
                        </p>
                        <p className="text-xs truncate max-w-[180px]" style={{ color: "var(--text-muted)" }}>{m.user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${sc.class}`}>{sc.label}</span>
                  </div>
                  {m.status === "PENDENTE" && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleAction(m.userId, "approve")} disabled={isProcessing}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "✓ Aprovar"}
                      </button>
                      <button onClick={() => handleAction(m.userId, "reject")} disabled={isProcessing}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "✕ Recusar"}
                      </button>
                    </div>
                  )}
                  {m.status === "RECUSADO" && m.role !== "ADMIN" && (
                    <div className="mt-3">
                      <button onClick={() => handleAction(m.userId, "reactivate")} disabled={isProcessing}
                        className="w-full py-2 text-xs font-semibold rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "↺ Reativar"}
                      </button>
                    </div>
                  )}
                  {m.status === "REMOVIDO" && m.role !== "ADMIN" && (
                    <div className="mt-3">
                      <button onClick={() => handleAction(m.userId, "reactivate")} disabled={isProcessing}
                        className="w-full py-2 text-xs font-semibold rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "↺ Reativar"}
                      </button>
                    </div>
                  )}
                  {m.status === "ATIVO" && m.role !== "ADMIN" && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button onClick={() => handleAction(m.userId, "makeAdmin")} disabled={isProcessing}
                        className="py-2 text-xs font-semibold rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "Tornar admin"}
                      </button>
                      <button onClick={() => handleAction(m.userId, "remove")} disabled={isProcessing}
                        className="py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                        {isProcessing ? "..." : "Remover"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
