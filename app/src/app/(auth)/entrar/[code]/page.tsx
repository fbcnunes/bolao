"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type BolaoPreview = {
  id: string;
  nome: string;
  createdAt: string;
  memberCount: number;
  members: { name: string; role: "ADMIN" | "PARTICIPANTE" }[];
};

export default function EntrarPage() {
  const { code } = useParams<{ code: string }>();
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bolao, setBolao] = useState<BolaoPreview | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [alreadyMember, setAlreadyMember] = useState(false);
  const autoJoinStarted = useRef(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/boloes/preview?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setBolao(data); })
      .finally(() => setLoadingPreview(false));
  }, [code]);

  const joinIntentUrl = `/entrar/${code}?join=1`;

  const handleJoin = useCallback(async () => {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(joinIntentUrl)}`);
      return;
    }

    setJoining(true);
    setError("");
    setAlreadyMember(false);
    try {
      const res = await fetch("/api/boloes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoined(true);
      } else {
        setError(data.message);
        setAlreadyMember(data.message === "Você já é membro deste bolão");
      }
    } catch {
      setError("Erro ao enviar solicitação.");
    } finally {
      setJoining(false);
    }
  }, [code, joinIntentUrl, router, session]);

  const handleGoToBolao = () => {
    if (bolao?.id) localStorage.setItem("activeBolaoId", bolao.id);
    router.push("/");
  };

  useEffect(() => {
    if (authStatus !== "authenticated" || !session || !bolao || joined || joining) return;
    if (searchParams.get("join") !== "1" || autoJoinStarted.current) return;

    autoJoinStarted.current = true;
    void handleJoin();
  }, [authStatus, bolao, handleJoin, joined, joining, searchParams, session]);

  if (loadingPreview) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md space-y-4 animate-pulse">
          <div className="h-8 rounded-xl w-2/3 mx-auto" style={{ background: "var(--bg-card2)" }} />
          <div className="glass-card rounded-2xl p-8 space-y-3">
            <div className="h-6 rounded w-1/2" style={{ background: "var(--bg-card2)" }} />
            <div className="h-4 rounded w-1/3" style={{ background: "var(--bg-card2)" }} />
            <div className="h-4 rounded w-1/4" style={{ background: "var(--bg-card2)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Bolão não encontrado</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>O código de convite é inválido ou o bolão não está mais ativo.</p>
          <Link href="/login" className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">Ir para o login</Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="glass-card rounded-2xl p-8">
            <svg className="w-14 h-14 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Solicitação enviada!</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Sua entrada em <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{bolao?.nome}</span> está aguardando aprovação do administrador.
            </p>
            <button onClick={() => router.push("/")} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold">
              Ir para os palpites
            </button>
          </div>
        </div>
      </div>
    );
  }

  const admin = bolao?.members.find((m) => m.role === "ADMIN");

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <p className="text-4xl mb-3">🏆</p>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
            {bolao?.nome}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Criado em {bolao ? format(new Date(bolao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ""}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-4">
          {/* Resumo */}
          <div className="flex items-center justify-between mb-5">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{bolao?.memberCount}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>participante{bolao?.memberCount !== 1 ? "s" : ""}</p>
            </div>
            {admin && (
              <div className="text-center flex-1 border-l" style={{ borderColor: "var(--border-base)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{admin.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>administrador</p>
              </div>
            )}
          </div>

          {/* Lista de membros */}
          {bolao && bolao.members.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Integrantes</p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {bolao.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "var(--border-base)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-card2)" }}>
                      <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>{m.name[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{m.name}</span>
                    {m.role === "ADMIN" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">admin</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-center">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        {/* CTA */}
        {session ? (
          <button
            onClick={alreadyMember ? handleGoToBolao : handleJoin}
            disabled={joining}
            className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {joining ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {joining ? "Enviando..." : alreadyMember ? "Ir para o Bolão" : "Solicitar entrada no bolão"}
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(joinIntentUrl)}`)}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold"
            >
              Entrar
            </button>
            <button
              onClick={() => router.push(`/cadastro?callbackUrl=${encodeURIComponent(joinIntentUrl)}`)}
              className="btn-secondary w-full py-3 rounded-xl text-sm font-semibold"
            >
              Cadastrar
            </button>
          </div>
        )}

        {!session && (
          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Depois do login ou cadastro, sua solicitação será enviada automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
