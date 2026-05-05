"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        body: JSON.stringify({ password, username }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos iniciar sesion.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-black text-amber-50/85">
        Usuario
        <input
          autoComplete="username"
          className="min-h-12 w-full rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
          onChange={(event) => setUsername(event.target.value)}
          required
          type="text"
          value={username}
        />
      </label>

      <label className="grid gap-2 text-sm font-black text-amber-50/85">
        Password
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
          {error}
        </p>
      ) : null}

      <button
        className="min-h-14 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-6 text-base font-black text-[#140b04] shadow-[0_18px_45px_rgba(245,158,11,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
