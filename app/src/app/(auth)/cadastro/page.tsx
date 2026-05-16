"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Erro ao realizar cadastro.");
      } else {
        setSuccess(data.message);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: "var(--text-primary)" }}>Solicitar Acesso</h1>
          <p style={{ color: "var(--text-secondary)" }}>Crie sua conta para participar do bolão</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-6 rounded-xl text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Cadastro Solicitado!</h3>
              <p className="text-sm text-emerald-200/80">{success}</p>
              <p className="text-xs text-emerald-200/60 mt-4">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="name">Nome completo</label>
                <input id="name" type="text" required className="input-field" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="email">E-mail</label>
                <input id="email" type="email" required className="input-field" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="password">Senha</label>
                <input id="password" type="password" required className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }} htmlFor="confirmPassword">Confirmar Senha</label>
                <input id="confirmPassword" type="password" required className="input-field" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary w-full flex justify-center items-center mt-6" disabled={loading}>
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Solicitar Cadastro"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Já tem uma conta?{' '}
              <Link href="/login" className="text-brand-primary hover:text-brand-primary/80 font-medium transition-colors">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
