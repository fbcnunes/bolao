"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function RedefinirSenhaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenMessage, setTokenMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenMessage("Link inválido.");
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        setTokenValid(data.valid);
        if (!data.valid) setTokenMessage(data.message ?? "Link inválido ou expirado.");
      })
      .catch(() => {
        setTokenValid(false);
        setTokenMessage("Erro ao validar link.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setMessage("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setMessage("Ocorreu um erro. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3 tracking-tight bg-gradient-to-r from-brand-primary to-emerald-300 text-transparent bg-clip-text">Bolão 2026</h1>
          <p className="text-brand-muted text-lg">Nova senha</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {tokenValid === null && (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Link inválido</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tokenMessage}</p>
              <Link href="/esqueci-senha" className="block mt-2 text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity">
                Solicitar novo link
              </Link>
            </div>
          )}

          {tokenValid === true && status !== "success" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Escolha uma nova senha para sua conta.
              </p>

              {status === "error" && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-medium">
                  {message}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="password">Nova senha</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="confirm">Confirmar senha</label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex justify-center items-center mt-8"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : "Salvar nova senha"}
              </button>
            </form>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Senha redefinida!</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecionando para o login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
