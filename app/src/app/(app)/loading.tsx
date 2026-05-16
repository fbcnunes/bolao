export default function Loading() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-lg" style={{ background: "var(--bg-topbar)", borderBottom: "1px solid var(--border-base)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Bolão Copa 2026</h1>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 border animate-pulse" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <div className="h-3 rounded w-1/3 mb-3" style={{ background: "var(--bg-card2)" }}></div>
              <div className="flex justify-between mb-4">
                <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
                <div className="h-5 rounded w-1/4" style={{ background: "var(--bg-card2)" }}></div>
                <div className="h-5 rounded w-1/3" style={{ background: "var(--bg-card2)" }}></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(j => <div key={j} className="h-10 rounded-xl" style={{ background: "var(--bg-card2)" }}></div>)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
