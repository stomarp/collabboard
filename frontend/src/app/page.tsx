const features = [
  "JWT protected dashboard",
  "PostgreSQL-backed boards",
  "Board activity history",
  "Real-time ready architecture",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-200">
          Real-time collaborative workspace
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
          Manage team work with live boards, presence, and activity updates.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          CollabBoard is a production-style task collaboration platform built
          with FastAPI, WebSockets, Redis, PostgreSQL, Next.js, and TypeScript.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/register"
            className="rounded-xl bg-sky-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Create Account
          </a>
          <a
            href="/login"
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Login
          </a>
          <a
            href="http://localhost:8000/docs"
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            API Docs
          </a>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-2xl shadow-slate-950/20"
            >
              <div className="mb-4 h-2 w-10 rounded-full bg-sky-400" />
              <h2 className="text-lg font-semibold">{feature}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Designed for multi-user collaboration and production-style
                system design.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
