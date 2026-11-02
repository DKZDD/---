"use client";

import { useEffect, useRef } from "react";
import type { LiveEvent } from "@/lib/events";

/**
 * Hook de tempo real com 3 modos automáticos:
 * 1. SSE nativo (desenvolvimento local, servidores Node)
 * 2. Polling automático quando a Vercel retorna {mode:"poll"} ou o SSE falha
 * 3. Polling por visibilidade de aba (sempre, como segurança extra)
 */
export function useLive(
  onEvent: (event: LiveEvent) => void,
  filter?: LiveEvent["type"],
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let pollMs = 8_000;

    const fire = () => {
      cbRef.current({ type: filter ?? "videos", action: "updated" });
    };

    const startPoll = (ms = pollMs) => {
      if (pollInterval) return;
      pollMs = ms;
      pollInterval = setInterval(fire, ms);
    };

    const stopPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const connect = () => {
      if (closed) return;

      // verifica primeiro se o endpoint suporta SSE ou retorna polling hint
      void fetch("/api/events", { method: "HEAD", cache: "no-store" })
        .then((r) => {
          const ct = r.headers.get("content-type") ?? "";
          if (ct.includes("text/event-stream")) {
            openSSE();
          } else {
            // endpoint retornou JSON (modo Vercel) — usa polling
            startPoll();
          }
        })
        .catch(() => startPoll());
    };

    const openSSE = () => {
      try {
        source = new EventSource("/api/events");

        source.addEventListener("live", (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as LiveEvent;
            if (!filter || data.type === filter) cbRef.current(data);
          } catch { /* payload inesperado */ }
        });

        source.addEventListener("ready", () => {
          stopPoll();
        });

        source.onerror = () => {
          source?.close();
          source = null;
          startPoll();
          if (!closed) {
            retryTimeout = setTimeout(() => {
              stopPoll();
              openSSE();
            }, 15_000);
          }
        };
      } catch {
        startPoll();
      }
    };

    connect();

    // revalida ao voltar para a aba
    const onVisible = () => {
      if (document.visibilityState === "visible") fire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      source?.close();
      stopPoll();
      if (retryTimeout) clearTimeout(retryTimeout);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [filter]);
}
