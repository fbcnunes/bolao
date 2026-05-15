export default function Loading() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <h1 className="text-lg font-bold text-white tracking-tight">Bolão Copa 2026</h1>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/80 rounded-2xl p-4 border border-white/10 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-1/3 mb-3"></div>
              <div className="flex justify-between mb-4">
                <div className="h-5 bg-slate-700 rounded w-1/3"></div>
                <div className="h-5 bg-slate-700 rounded w-1/4"></div>
                <div className="h-5 bg-slate-700 rounded w-1/3"></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-slate-700 rounded-xl"></div>
                <div className="h-10 bg-slate-700 rounded-xl"></div>
                <div className="h-10 bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
