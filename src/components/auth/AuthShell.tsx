"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  step = 1,
  totalSteps = 2,
}: {
  children: React.ReactNode;
  step?: 1 | 2;
  totalSteps?: number;
}) {
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    try {
      setEmbedded(window.self !== window.top);
    } catch {
      setEmbedded(true);
    }
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* brilhos de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 320px at 15% 0%, rgba(255,210,26,0.10), transparent 60%), radial-gradient(700px 380px at 90% 100%, rgba(255,210,26,0.07), transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-white/10 bg-panel/90 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur sm:p-8">
          {children}

          <div className="mt-7 flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i + 1 === step ? "w-8 bg-brand" : "w-4 bg-zinc-700",
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para o site
          </Link>

          {embedded && (
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-amber-500/90">
              <ExternalLink className="h-3 w-3 shrink-0" />
              O login não persiste na pré-visualização?{" "}
              <button
                type="button"
                onClick={() =>
                  window.open(
                    window.location.href,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="font-semibold underline underline-offset-2 transition hover:text-amber-400"
              >
                Abrir em uma nova guia
              </button>
            </p>
          )}

          <p className="text-[11px] text-zinc-700">
            Acesso exclusivo do administrador do DuckeFlix.
          </p>
        </div>
      </div>
    </div>
  );
}
