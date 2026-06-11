"use client";

import { useState } from "react";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message);
      setStatus(res.ok ? "success" : "error");
    } catch {
      setMessage("Ocorreu um erro. Tente novamente.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3 tracking-tight bg-gradient-to-r from-brand-primary to-emerald-300 text-transparent bg-clip-text">Bolão 2026</h1>
          <p className="text-brand-muted text-lg">Recuperar senha</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {status === "success" ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Verifique seu e-mail</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
              <Link href="/login" className="block mt-4 text-sm font-semibold text-brand-primary hover:opacity-80 transition-opacity">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              {status === "error" && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-medium">
                  {message}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                ) : "Enviar link de recuperação"}
              </button>

              <div className="text-center mt-4">
                <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: "var(--text-muted)" }}>
                  Lembrei minha senha &rarr; Fazer login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
