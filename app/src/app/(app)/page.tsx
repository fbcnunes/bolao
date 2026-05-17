"use client";

import TopBar from "@/components/TopBar";
import HomeClient from "@/components/HomeClient";
import { useSession } from "next-auth/react";
import { useBolao } from "@/contexts/BolaoContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: session } = useSession();
  const { activeBolao, loading } = useBolao();
  const router = useRouter();

  const isMaster = session?.user?.role === "MASTER";

  // Master: redireciona para o painel master
  if (isMaster) {
    return (
      <div className="min-h-screen">
        <TopBar title="Bolão Copa 2026" />
        <main className="max-w-lg mx-auto px-4 pt-16 pb-4 flex flex-col items-center text-center">
          <p className="text-5xl mb-4">🛡️</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Painel Master
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Como Master, você gerencia os bolões e usuários, mas não participa dos palpites.
          </p>
          <button
            onClick={() => router.push("/master")}
            className="bg-brand-primary text-white font-semibold py-3 px-8 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Ir para o Painel Master
          </button>
        </main>
      </div>
    );
  }

  // Carregando bolões
  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Bolão Copa 2026" />
        <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
          <div className="space-y-3 animate-pulse mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Sem bolão ativo: orienta o usuário
  if (!activeBolao) {
    return (
      <div className="min-h-screen">
        <TopBar title="Bolão Copa 2026" />
        <main className="max-w-lg mx-auto px-4 pt-16 pb-4 flex flex-col items-center text-center">
          <p className="text-5xl mb-4">🏆</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Você ainda não está em nenhum bolão
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Entre em um bolão com o código de convite ou crie o seu próprio para começar a dar palpites.
          </p>
          <button
            onClick={() => router.push("/meus-boloes")}
            className="bg-brand-primary text-white font-semibold py-3 px-8 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Ver meus bolões
          </button>
        </main>
      </div>
    );
  }

  // Participante com bolão ativo: mostra palpites normalmente
  return (
    <div className="min-h-screen">
      <TopBar title="Bolão Copa 2026" />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        <HomeClient />
      </main>
    </div>
  );
}
