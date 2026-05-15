"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { useSession } from "next-auth/react";

type RankingEntry = {
  user: { id: string; name: string };
  totalPoints: number;
  correctPredictions: number;
};

const podiumColors = [
  "from-amber-400 to-yellow-300",
  "from-slate-400 to-slate-300",
  "from-amber-700 to-amber-600",
];

const podiumIcons = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const { data: session } = useSession();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((data) => setRanking(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const myEntry = ranking.find((e) => e.user.id === session?.user?.id);
  const myPosition = ranking.findIndex((e) => e.user.id === session?.user?.id) + 1;
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="min-h-screen">
      <TopBar title="Ranking" />

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
                  <div className="flex-1 h-5 bg-slate-700 rounded"></div>
                  <div className="w-16 h-5 bg-slate-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center mt-8">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-semibold mb-1">Ranking ainda vazio</p>
            <p className="text-slate-500 text-sm">Dê seus palpites e apareça aqui!</p>
          </div>
        ) : (
          <>
            {/* My Position Banner */}
            {myEntry && (
              <div className="mb-4 p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
                <p className="text-xs text-brand-primary font-semibold uppercase tracking-wider mb-1">Sua posição</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">#{myPosition}</span>
                    <span className="text-white font-semibold">{myEntry.user.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-primary font-bold text-lg">{myEntry.totalPoints.toFixed(1)} pts</p>
                    <p className="text-slate-500 text-xs">{myEntry.correctPredictions} acertos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Pódio</h2>
                <div className="grid grid-cols-3 gap-3">
                  {top3.map((entry, idx) => (
                    <div key={entry.user.id} className={`glass-card rounded-2xl p-3 text-center ${entry.user.id === session?.user?.id ? "border-brand-primary/50" : ""}`}>
                      <p className="text-2xl mb-1">{podiumIcons[idx]}</p>
                      <p className="text-white text-xs font-semibold leading-tight truncate">{entry.user.name.split(" ")[0]}</p>
                      <p className={`text-sm font-bold mt-1 bg-gradient-to-r ${podiumColors[idx]} text-transparent bg-clip-text`}>
                        {entry.totalPoints.toFixed(1)}
                      </p>
                      <p className="text-slate-600 text-[10px]">{entry.correctPredictions} ✓</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Ranking List */}
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Classificação Geral</h2>
            <div className="space-y-2">
              {ranking.map((entry, idx) => {
                const isMe = entry.user.id === session?.user?.id;
                const position = idx + 1;
                return (
                  <div
                    key={entry.user.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl transition-all
                      ${isMe ? "bg-brand-primary/10 border border-brand-primary/20" : "bg-slate-800/40 border border-white/5"}
                    `}
                  >
                    <span className={`w-7 text-center text-sm font-bold ${
                      position === 1 ? "text-amber-400" :
                      position === 2 ? "text-slate-300" :
                      position === 3 ? "text-amber-700" :
                      "text-slate-500"
                    }`}>
                      {position}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 border border-white/10">
                      <span className={`text-sm font-bold ${isMe ? "text-brand-primary" : "text-slate-300"}`}>
                        {entry.user.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? "text-brand-primary" : "text-white"}`}>
                        {entry.user.name} {isMe && <span className="text-xs font-normal">(você)</span>}
                      </p>
                      <p className="text-slate-500 text-xs">{entry.correctPredictions} acerto{entry.correctPredictions !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isMe ? "text-brand-primary" : "text-white"}`}>
                        {entry.totalPoints.toFixed(1)}
                      </p>
                      <p className="text-slate-600 text-[10px]">pontos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
