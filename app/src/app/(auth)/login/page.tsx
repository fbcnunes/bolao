"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3 tracking-tight bg-gradient-to-r from-brand-primary to-emerald-300 text-transparent bg-clip-text">Bolão 2026</h1>
          <p className="text-brand-muted text-lg">Faça login para dar seus palpites</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
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
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium block" style={{ color: "var(--text-secondary)" }} htmlFor="password">Senha</label>
              </div>
              <input
                id="password"
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full flex justify-center items-center mt-8"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Entrar no Bolão"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="text-brand-primary hover:text-brand-primary/80 font-medium transition-colors">
                Solicite acesso
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
