"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { AdminClient } from "@/components/admin/AdminClient";
import { Logo } from "@/components/Logo";
import { clearToken, getStoredToken } from "@/lib/session";
import type { SafeUser, Video } from "@/db/schema";

type GateState =
  | { status: "checking" }
  | { status: "error" }
  | { status: "denied" }
  | { status: "ready"; admin: SafeUser; videos: Video[] };

/**
 * Portão da área restrita: valida a sessão no cliente via token Bearer,
 * sem depender de cookies — imune a bloqueios de cookies de terceiros.
 */
export function AdminGate() {
  const [state, setState] = useState<GateState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getStoredToken();
      if (!token) {
        window.location.replace("/DuckeScripts/login");
        return;
      }

      try {
        const me = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (me.status === 401) {
          clearToken();
          window.location.replace("/DuckeScripts/login");
          return;
        }
        if (!me.ok) throw new Error("verificação falhou");

        const admin = (await me.json()) as SafeUser;
        if (!admin.permissions.accessPanel) {
          if (!cancelled) setState({ status: "denied" });
          return;
        }

        const res = await fetch("/api/videos", { cache: "no-store" });
        const videos = res.ok ? ((await res.json()) as Video[]) : [];

        if (!cancelled) setState({ status: "ready", admin, videos });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-400" />
        <p className="text-lg font-bold text-white">Acesso negado</p>
        <p className="max-w-sm text-sm text-zinc-500">
          Esta conta não tem permissão de administrador.
        </p>
        <a
          href="/"
          className="focus-duck rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300"
        >
          Voltar ao site
        </a>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-brand" />
        <p className="text-lg font-bold text-white">Falha ao verificar a sessão</p>
        <p className="max-w-sm text-sm text-zinc-500">
          Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (state.status === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5">
        <Logo />
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
        <p className="text-sm text-zinc-500">Verificando sessão…</p>
      </div>
    );
  }

  return <AdminClient initialVideos={state.videos} admin={state.admin} />;
}
