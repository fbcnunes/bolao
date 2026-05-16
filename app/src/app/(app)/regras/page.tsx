"use client";

import TopBar from "@/components/TopBar";

const phases = [
  { label: "Fase de grupos", points: 10 },
  { label: "16 avos / Playoffs iniciais", points: 15 },
  { label: "Oitavas de final", points: 20 },
  { label: "Quartas de final", points: 30 },
  { label: "Semifinais", points: 40 },
  { label: "Final", points: 50 },
];

const tiebreakers = [
  "Maior número de acertos no mata-mata",
  "Maior número de acertos nas semifinais e final",
  "Acerto do campeão da Copa",
  "Maior número total de acertos em toda a Copa",
  "Divisão da premiação entre os empatados",
];

export default function RegrasPage() {
  return (
    <div className="min-h-screen">
      <TopBar title="Regras do Bolão" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Pontuação por fase */}
        <section className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs">1</span>
            Pontuação por Fase
          </h2>
          <div className="space-y-2">
            {phases.map((p) => (
              <div key={p.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-slate-300 text-sm">{p.label}</span>
                <span className="font-bold text-brand-primary text-sm whitespace-nowrap">+{p.points} pts</span>
              </div>
            ))}
          </div>
        </section>

        {/* Bônus diário */}
        <section className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-secondary/20 text-brand-secondary flex items-center justify-center text-xs">2</span>
            Bônus Diário e por Rodada
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20">
              <span className="text-brand-secondary text-lg mt-0.5">⚡</span>
              <div>
                <p className="text-white text-sm font-semibold">Melhor pontuação do dia</p>
                <p className="text-slate-400 text-xs mt-0.5">O participante com maior pontuação no dia recebe <span className="text-brand-secondary font-bold">+10 pts</span> de bônus.</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs px-1">
              Em caso de empate na maior pontuação do dia, todos os empatados recebem o bônus de +10 pontos.
            </p>
          </div>
        </section>

        {/* Palpite do campeão */}
        <section className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">3</span>
            Palpite do Campeão
          </h2>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white text-sm font-semibold">Acerto do campeão</p>
              <p className="text-amber-400 font-bold text-lg">+100 pts</p>
              <p className="text-slate-400 text-xs">Registrado antes do início da competição.</p>
            </div>
          </div>
        </section>

        {/* Critérios de desempate */}
        <section className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-600/50 text-slate-300 flex items-center justify-center text-xs">4</span>
            Critérios de Desempate
          </h2>
          <div className="space-y-2">
            {tiebreakers.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm leading-snug">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Resumo rápido */}
        <section className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Resumo</h2>
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: "Grupos", value: "10 pts" },
              { label: "Playoffs", value: "15 pts" },
              { label: "Oitavas", value: "20 pts" },
              { label: "Quartas", value: "30 pts" },
              { label: "Semis", value: "40 pts" },
              { label: "Final", value: "50 pts" },
              { label: "Bônus dia", value: "+10 pts" },
              { label: "Campeão", value: "+100 pts" },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/60 rounded-xl py-2 px-3">
                <p className="text-slate-400 text-xs">{item.label}</p>
                <p className="text-brand-primary font-bold text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
