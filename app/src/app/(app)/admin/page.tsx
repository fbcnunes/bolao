"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";

type User = {
  id: string;
  name: string;
  email: string;
  status: "PENDENTE" | "ATIVO" | "RECUSADO";
  role: string;
  createdAt: string;
};

const statusConfig = {
  PENDENTE: { label: "Pendente", class: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  ATIVO: { label: "Ativo", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  RECUSADO: { label: "Recusado", class: "bg-red-500/10 text-red-400 border border-red-500/20" },
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"TODOS" | "PENDENTE" | "ATIVO" | "RECUSADO">("PENDENTE");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        fetchUsers();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao realizar ação." });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredUsers = users.filter((u) =>
    filter === "TODOS" ? true : u.status === filter
  );

  const pendingCount = users.filter((u) => u.status === "PENDENTE").length;

  return (
    <div className="min-h-screen">
      <TopBar title="Painel Admin" />

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total", value: users.length, color: "text-white" },
            { label: "Ativos", value: users.filter((u) => u.status === "ATIVO").length, color: "text-emerald-400" },
            { label: "Pendentes", value: pendingCount, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Toast */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center
            ${message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
            }`}>
            {message.text}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(["PENDENTE", "ATIVO", "RECUSADO", "TODOS"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                ${filter === f ? "bg-brand-primary text-white" : "bg-slate-800/60 text-slate-400 hover:text-white"}`}
            >
              {f === "TODOS" ? "Todos" : f === "PENDENTE" ? `Pendentes ${pendingCount > 0 ? `(${pendingCount})` : ""}` : f === "ATIVO" ? "Ativos" : "Recusados"}
            </button>
          ))}
        </div>

        {/* User List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-slate-400 text-sm">Nenhum usuário nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const sc = statusConfig[user.status];
              const isProcessing = actionLoading === user.id;
              return (
                <div key={user.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{user.name[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{user.name}</p>
                        <p className="text-slate-500 text-xs truncate max-w-[180px]">{user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${sc.class}`}>
                      {sc.label}
                    </span>
                  </div>

                  {user.status === "PENDENTE" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction(user.id, "approve")}
                        disabled={isProcessing}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? "..." : "✓ Aprovar"}
                      </button>
                      <button
                        onClick={() => handleAction(user.id, "reject")}
                        disabled={isProcessing}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? "..." : "✕ Recusar"}
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
