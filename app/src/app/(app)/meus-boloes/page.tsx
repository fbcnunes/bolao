"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import { useBolao, BolaoSummary } from "@/contexts/BolaoContext";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function MeusBolaoPage() {
  const { boloes, activeBolao, setActiveBolao, reload, loading } = useBolao();
  const router = useRouter();

  const [modalCriar, setModalCriar] = useState(false);
  const [modalEntrar, setModalEntrar] = useState(false);
  const [modalConta, setModalConta] = useState(false);
  const [nomeBolao, setNomeBolao] = useState("");
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [saving, setSaving] = useState(false);
  const [leavingBolaoId, setLeavingBolaoId] = useState<string | null>(null);
  const [removingAccount, setRemovingAccount] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleCriar = async () => {
    if (!nomeBolao.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/boloes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeBolao.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", data.message);
        reload();
        setModalCriar(false);
        setNomeBolao("");
      } else {
        showMsg("error", data.message);
      }
    } catch {
      showMsg("error", "Erro ao criar bolão.");
    } finally {
      setSaving(false);
    }
  };

  const handleEntrarNavegar = () => {
    const code = codigoEntrar.trim();
    if (!code) return;
    router.push(`/entrar/${code}`);
  };

  const handleSelect = (b: BolaoSummary) => {
    setActiveBolao(b);
    router.push("/");
  };

  const handleLeaveBolao = async (b: BolaoSummary) => {
    if (!window.confirm(`Sair do bolão "${b.nome}"? Seus palpites ficam preservados, mas você sai do ranking enquanto estiver removido.`)) return;

    setLeavingBolaoId(b.id);
    try {
      const res = await fetch(`/api/boloes/${b.id}/leave`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", data.message);
        if (activeBolao?.id === b.id) setActiveBolao(null);
        reload();
      } else {
        showMsg("error", data.message);
      }
    } catch {
      showMsg("error", "Erro ao sair do bolão.");
    } finally {
      setLeavingBolaoId(null);
    }
  };

  const handleRemoveAccount = async () => {
    setRemovingAccount(true);
    try {
      const res = await fetch("/api/user/remove", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        showMsg("error", data.message);
        setModalConta(false);
      }
    } catch {
      showMsg("error", "Erro ao solicitar exclusão da conta.");
    } finally {
      setRemovingAccount(false);
    }
  };

  const ativos = boloes.filter((b) => b.status === "ATIVO");
  const pendentes = boloes.filter((b) => b.status === "PENDENTE");

  const statusBadge = (b: BolaoSummary) => {
    if (b.status === "PENDENTE") return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Aguardando aprovação</span>;
    if (b.status === "RECUSADO") return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Recusado</span>;
    return b.memberRole === "ADMIN"
      ? <span className="text-xs px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">Admin</span>
      : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Participante</span>;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Meus Bolões" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6">

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setModalCriar(true)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-brand-primary text-white flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Criar bolão
          </button>
          <button
            onClick={() => setModalEntrar(true)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
            </svg>
            Entrar com código
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <div className="h-5 rounded w-1/2 mb-2" style={{ background: "var(--bg-card2)" }} />
                <div className="h-4 rounded w-1/3" style={{ background: "var(--bg-card2)" }} />
              </div>
            ))}
          </div>
        ) : boloes.length === 0 ? (
          <div className="rounded-2xl p-10 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhum bolão ainda</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Crie um bolão ou entre com o código de convite.</p>
          </div>
        ) : (
          <>
            {ativos.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Ativos</p>
                <div className="space-y-3 mb-6">
                  {ativos.map((b) => {
                    const isActive = activeBolao?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`rounded-2xl p-4 border cursor-pointer transition-all active:scale-[0.98] ${isActive ? "border-brand-primary/50 bg-brand-primary/5" : ""}`}
                        style={!isActive ? { background: "var(--bg-card)", borderColor: "var(--border-base)" } : {}}
                        onClick={() => handleSelect(b)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className={`font-bold text-base ${isActive ? "text-brand-primary" : ""}`} style={!isActive ? { color: "var(--text-primary)" } : {}}>
                            {b.nome}
                            {isActive && <span className="ml-2 text-xs font-normal text-brand-primary">● ativo</span>}
                          </p>
                          {statusBadge(b)}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b._count.members} participante{b._count.members !== 1 ? "s" : ""}</p>
                          <div className="flex items-center gap-2">
                            {b.memberRole === "ADMIN" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/bolao/${b.id}/admin`); }}
                                className="text-xs px-3 py-1 rounded-xl cursor-pointer transition-all hover:opacity-70"
                                style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}
                              >
                                Gerenciar
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLeaveBolao(b); }}
                              disabled={leavingBolaoId === b.id}
                              className="text-xs px-3 py-1 rounded-xl cursor-pointer transition-all hover:opacity-70 disabled:opacity-50"
                              style={{ background: "rgba(239, 68, 68, 0.12)", color: "rgb(248 113 113)" }}
                            >
                              {leavingBolaoId === b.id ? "..." : "Sair"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {pendentes.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Aguardando aprovação</p>
                <div className="space-y-3">
                  {pendentes.map((b) => (
                    <div key={b.id} className="rounded-2xl p-4 border opacity-70" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{b.nome}</p>
                        {statusBadge(b)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-8 pt-5 border-t" style={{ borderColor: "var(--border-base)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Conta</p>
          <button
            onClick={() => setModalConta(true)}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95"
          >
            Excluir minha conta
          </button>
        </div>
      </main>

      {/* Modal Criar */}
      {modalCriar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-24">
          <div className="rounded-2xl p-5 w-full max-w-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <h3 className="font-bold mb-4 text-center" style={{ color: "var(--text-primary)" }}>Criar novo bolão</h3>
            <input
              autoFocus
              value={nomeBolao}
              onChange={(e) => setNomeBolao(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
              placeholder="Nome do bolão"
              className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none border"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            />
            <p className="text-xs mb-4 text-center" style={{ color: "var(--text-muted)" }}>
              O bolão será criado após aprovação do Master.
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setModalCriar(false); setNomeBolao(""); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
                style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleCriar} disabled={saving || !nomeBolao.trim()}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-primary text-white cursor-pointer disabled:opacity-50">
                {saving ? "..." : "Solicitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrar com código */}
      {modalEntrar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-24">
          <div className="rounded-2xl p-5 w-full max-w-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <h3 className="font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Entrar em um bolão</h3>
            <p className="text-xs text-center mb-4" style={{ color: "var(--text-muted)" }}>
              Digite o código recebido para ver o resumo do bolão antes de solicitar a entrada.
            </p>
            <input
              autoFocus
              value={codigoEntrar}
              onChange={(e) => setCodigoEntrar(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEntrarNavegar()}
              placeholder="Código de convite"
              className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none border font-mono"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setModalEntrar(false); setCodigoEntrar(""); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
                style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleEntrarNavegar} disabled={!codigoEntrar.trim()}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-brand-primary text-white cursor-pointer disabled:opacity-50">
                Ver bolão
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-24">
          <div className="rounded-2xl p-5 w-full max-w-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
            <h3 className="font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Excluir minha conta</h3>
            <p className="text-xs text-center mb-4" style={{ color: "var(--text-muted)" }}>
              Sua conta e suas participações serão removidas logicamente. Se você administra algum bolão ativo, transfira a função antes.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setModalConta(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
                style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleRemoveAccount} disabled={removingAccount}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 cursor-pointer disabled:opacity-50">
                {removingAccount ? "..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
