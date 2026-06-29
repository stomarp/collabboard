"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import { AuthToken, storeToken } from "@/lib/auth";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await apiRequest("/auth/register", {
          method: "POST",
          body: {
            email,
            password,
            full_name: fullName || null,
          },
        });
      }

      const token = await apiRequest<AuthToken>("/auth/login", {
        method: "POST",
        body: {
          email,
          password,
        },
      });

      storeToken(token.access_token);
      router.push("/dashboard");
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <section>
            <Link href="/" className="text-sm font-semibold text-sky-300">
              CollabBoard
            </Link>

            <h1 className="mt-6 max-w-2xl text-5xl font-bold tracking-tight">
              {isRegister
                ? "Create your collaborative workspace."
                : "Welcome back to your team workspace."}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Manage boards, tasks, roles, and activity history from one
              production-style collaboration platform.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                JWT protected dashboard
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                PostgreSQL-backed boards
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Activity log foundation
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Real-time ready architecture
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-slate-950/30"
          >
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-300">
                {isRegister ? "Register" : "Login"}
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                {isRegister ? "Start building" : "Sign in"}
              </h2>
            </div>

            <div className="mt-8 space-y-5">
              {isRegister ? (
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Full name
                  </span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                    placeholder="Swati"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-slate-200">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">
                  Password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="At least 8 characters"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 w-full rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Login"}
            </button>

            <p className="mt-6 text-center text-sm text-slate-400">
              {isRegister ? "Already have an account?" : "New to CollabBoard?"}{" "}
              <Link
                href={isRegister ? "/login" : "/register"}
                className="font-semibold text-sky-300 hover:text-sky-200"
              >
                {isRegister ? "Login" : "Create an account"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
