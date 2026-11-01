"use client";

import { useEffect, useRef } from "react";
import type { LiveEvent } from "@/lib/events";

/**
 * Assina o stream SSE /api/events e dispara o callback sempre que algo
 * muda no servidor — é o que mantém catálogo e painel sincronizados em
 * tempo real, em todas as abas abertas.
 *
 * Inclui reconexão automática e um "poll" leve de segurança caso o
 * EventSource não esteja disponível/seja bloqueado.
 */
export function useLive(
  onEvent: (event: LiveEvent) => void,
  filter?: LiveEvent["type"],
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const startFallback = () => {
      if (fallback) return;
      // plano B: atualiza a cada 10s se o SSE não funcionar
      fallback = setInterval(() => {
        cbRef.current({ type: filter ?? "videos", action: "updated" });
      }, 10_000);
    };

    const connect = () => {
      if (closed) return;
      try {
        source = new EventSource("/api/events");

        source.addEventListener("live", (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as LiveEvent;
            if (!filter || data.type === filter) cbRef.current(data);
          } catch {
            /* payload inesperado: ignora */
          }
        });

        source.addEventListener("ready", () => {
          if (fallback) {
            clearInterval(fallback);
            fallback = null;
          }
        });

        source.onerror = () => {
          source?.close();
          source = null;
          startFallback();
          if (!closed) {
            retry = setTimeout(connect, 4000);
          }
        };
      } catch {
        startFallback();
      }
    };

    connect();

    // revalida ao voltar para a aba
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        cbRef.current({ type: filter ?? "videos", action: "updated" });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      source?.close();
      if (fallback) clearInterval(fallback);
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [filter]);
}
