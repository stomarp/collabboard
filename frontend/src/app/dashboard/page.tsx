"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import { AuthUser, clearStoredToken, getStoredToken } from "@/lib/auth";

type Board = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);

  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        router.replace("/login");
        return;
      }

      setToken(storedToken);

      try {
        const [currentUser, boardList] = await Promise.all([
          apiRequest<AuthUser>("/auth/me", { token: storedToken }),
          apiRequest<Board[]>("/boards", { token: storedToken }),
        ]);

        setUser(currentUser);
        setBoards(boardList);
      } catch {
        clearStoredToken();
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !boardName.trim()) {
      return;
    }

    setError(null);
    setIsCreatingBoard(true);

    try {
      const board = await apiRequest<Board>("/boards", {
        method: "POST",
        token,
        body: {
          name: boardName.trim(),
          description: boardDescription.trim() || null,
        },
      });

      setBoards((currentBoards) => [board, ...currentBoards]);
      setBoardName("");
      setBoardDescription("");
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Could not create board. Please try again.");
      }
    } finally {
      setIsCreatingBoard(false);
    }
  }

  function handleLogout() {
    clearStoredToken();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-sky-300">
              CollabBoard
            </Link>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-300">
              Welcome{user?.full_name ? `, ${user.full_name}` : ""}. Manage your
              collaborative boards from here.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Logout
          </button>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleCreateBoard}
            className="h-fit rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-slate-950/30"
          >
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
              New board
            </p>
            <h2 className="mt-3 text-2xl font-bold">Create workspace board</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start a Kanban board for sprint planning, project delivery, or
              team collaboration.
            </p>

            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-200">
                Board name
              </span>
              <input
                required
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                placeholder="Engineering Sprint"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-200">
                Description
              </span>
              <textarea
                value={boardDescription}
                onChange={(event) => setBoardDescription(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                placeholder="Track work for this sprint..."
              />
            </label>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isCreatingBoard}
              className="mt-6 w-full rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingBoard ? "Creating..." : "Create board"}
            </button>
          </form>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-300">
                  Boards
                </p>
                <h2 className="mt-2 text-2xl font-bold">Your boards</h2>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {boards.length} total
              </div>
            </div>

            {boards.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-10 text-center">
                <h3 className="text-xl font-semibold">No boards yet</h3>
                <p className="mt-3 text-slate-400">
                  Create your first board to start organizing collaborative work.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {boards.map((board) => (
                  <article
                    key={board.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:border-sky-300/40 hover:bg-white/[0.08]"
                  >
                    <div className="mb-4 h-2 w-12 rounded-full bg-sky-400" />
                    <h3 className="text-xl font-semibold">{board.name}</h3>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                      {board.description || "No description added yet."}
                    </p>
                    <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">
                      Board ID: {board.id}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
