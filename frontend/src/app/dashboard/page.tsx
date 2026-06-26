export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-300">
          CollabBoard
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Board management will be added in a later PR. This page is included as
          the frontend scaffold entry point for the product dashboard.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Boards coming soon</h2>
          <p className="mt-3 text-slate-400">
            PR #9 will connect this dashboard to the board list and create-board flow.
          </p>
        </div>
      </section>
    </main>
  );
}
