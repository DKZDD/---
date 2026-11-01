"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { persistToken } from "@/lib/session";

export function RegisterClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível criar a conta.");
        return;
      }
      if (typeof data.sessionToken === "string") persistToken(data.sessionToken);
      toast.success("Conta criada! Bom filme 🍿");
      setTimeout(() => window.location.assign("/"), 400);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell step={1} totalSteps={1}>
      <div className="mb-6 space-y-3 text-center">
        <span className="inline-flex rounded-2xl border border-brand/25 bg-brand/10 p-3">
          <UserPlus className="h-6 w-6 text-brand" />
        </span>
        <h1 className="text-xl font-bold text-white">Criar sua conta</h1>
        <p className="text-sm leading-relaxed text-zinc-500">
          É grátis. Assista ao catálogo e libere os exclusivos com o DuckeFlix VIP.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Nome
          </label>
          <input
            id="reg-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como quer ser chamado?"
            className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-3 text-sm text-white placeholder:text-zinc-600"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 py-3 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Senha (mín. 8 caracteres)
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 py-3 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="focus-duck flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-extrabold text-black transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar conta grátis
        </button>

        <p className="pt-1 text-center text-xs text-zinc-500">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
