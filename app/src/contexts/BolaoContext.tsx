"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type BolaoSummary = {
  id: string;
  nome: string;
  inviteCode: string;
  status: "PENDENTE" | "ATIVO" | "RECUSADO";
  memberRole: "ADMIN" | "PARTICIPANTE";
  _count: { members: number };
};

type BolaoContextType = {
  boloes: BolaoSummary[];
  activeBolao: BolaoSummary | null;
  setActiveBolao: (b: BolaoSummary | null) => void;
  reload: () => void;
  loading: boolean;
};

const BolaoContext = createContext<BolaoContextType>({
  boloes: [],
  activeBolao: null,
  setActiveBolao: () => {},
  reload: () => {},
  loading: true,
});

export function BolaoProvider({ children }: { children: React.ReactNode }) {
  const [boloes, setBoloes] = useState<BolaoSummary[]>([]);
  const [activeBolao, setActiveBolaoState] = useState<BolaoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/boloes")
      .then((r) => r.json())
      .then((data: BolaoSummary[]) => {
        if (!Array.isArray(data)) return;
        const ativos = data.filter((b) => b.status === "ATIVO");
        setBoloes(data);

        // Restaura o bolão ativo do localStorage ou usa o primeiro ativo
        const savedId = localStorage.getItem("activeBolaoId");
        const saved = ativos.find((b) => b.id === savedId);
        setActiveBolaoState(saved ?? ativos[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const setActiveBolao = (b: BolaoSummary | null) => {
    setActiveBolaoState(b);
    if (b) localStorage.setItem("activeBolaoId", b.id);
    else localStorage.removeItem("activeBolaoId");
  };

  return (
    <BolaoContext.Provider value={{ boloes, activeBolao, setActiveBolao, reload: load, loading }}>
      {children}
    </BolaoContext.Provider>
  );
}

export function useBolao() {
  return useContext(BolaoContext);
}
