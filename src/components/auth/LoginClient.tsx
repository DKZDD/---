"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { clearToken, getStoredToken, persistToken } from "@/lib/session";

export function LoginClient({ mode = "user" }: { mode?: "user" | "admin" }) {
  const isAdmin = mode === "admin";
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [preToken, setPreToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // já autenticado? segue direto
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void (async () => {
      try {
        const me = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (me.ok) {
          const u = (await me.json()) as { role: string };
          if (isAdmin && u.role !== "admin") return;
          window.location.replace(isAdmin ? "/DuckeScripts" : "/");
        } else if (me.status === 401) {
          clearToken();
        }
      } catch {
        /* offline: segue no formulário */
      }
    })();
  }, [isAdmin]);

  function goAfterLogin(token: string, canAccessPanel: boolean) {
    persistToken(token);
    if (canAccessPanel) {
      window.location.assign(`/DuckeScripts?sessao=${encodeURIComponent(token)}`);
    } else {
      window.location.assign("/");
    }
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível entrar.");
        return;
      }

      if (data.requires2fa) {
        setPreToken(String(data.preToken ?? ""));
        setStep(2);
        setCode("");
        return;
      }

      if (isAdmin && data.user?.role !== "admin") {
        setError("Esta conta não tem acesso ao painel administrativo.");
        return;
      }

      toast.success("Bem-vindo de volta!");
      setTimeout(() => goAfterLogin(data.sessionToken, data.user?.role), 300);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, epoch: Date.now(), preToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Código inválido.");
        return;
      }
      toast.success("Identidade confirmada!");
      setTimeout(() => goAfterLogin(data.sessionToken, data.user?.role), 300);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell step={step}>
      {step === 1 ? (
        <>
          <div className="mb-6 space-y-3 text-center">
            <span className="inline-flex rounded-2xl border border-brand/25 bg-brand/10 p-3">
              <Lock className="h-6 w-6 text-brand" />
            </span>
            <h1 className="text-xl font-bold text-white">
              {isAdmin ? "Área restrita" : "Entrar no DuckeFlix"}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-500">
              {isAdmin
                ? "Acesso exclusivo para administradores, com verificação em 2 etapas."
                : "Entre para continuar assistindo de onde parou."}
            </p>
          </div>

          <form onSubmit={submitCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-email"
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
              <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
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
              Entrar
            </button>

            {!isAdmin && (
              <p className="pt-1 text-center text-xs text-zinc-500">
                Ainda não tem conta?{" "}
                <Link href="/criar-conta" className="font-semibold text-brand hover:underline">
                  Criar conta grátis
                </Link>
              </p>
            )}
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 space-y-3 text-center">
            <span className="inline-flex rounded-2xl border border-brand/25 bg-brand/10 p-3">
              <ShieldCheck className="h-6 w-6 text-brand" />
            </span>
            <h1 className="text-xl font-bold text-white">Verificação em 2 etapas</h1>
            <p className="text-sm leading-relaxed text-zinc-500">
              Digite o código de 6 dígitos do seu app autenticador para{" "}
              <span className="font-medium text-brand">{email}</span>.
            </p>
          </div>

          <form onSubmit={submitCode} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              aria-label="Código de verificação"
              className="focus-duck w-full rounded-lg border border-white/10 bg-panel-2 py-4 text-center font-mono text-2xl font-bold tracking-[0.6em] text-white placeholder:text-zinc-700"
            />

            {error && (
              <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="focus-duck flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-extrabold text-black transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verificar e entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
              }}
              className="focus-duck mx-auto flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
