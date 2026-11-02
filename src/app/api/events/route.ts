import { subscribe, type LiveEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Aumenta o timeout máximo na Vercel (Pro: 300s, Hobby: 60s)
export const maxDuration = 55;

/**
 * Stream SSE — funciona em servidores Node.js (dev local, VPS, Railway).
 * Na Vercel Hobby, a Vercel encerra conexões em 60s; o cliente reconecta
 * automaticamente. Ambientes que não suportam streaming recebem um array
 * vazio imediatamente e o cliente cai no modo polling.
 */
export async function GET(request: Request) {
  // detecta Vercel Hobby/Edge que não suporta streaming longo
  const isVercel = Boolean(process.env.VERCEL);
  const isEdge = request.headers.get("x-vercel-id") !== null;

  if (isVercel) {
    // Na Vercel, retorna resposta imediata com hint para o cliente usar polling
    return Response.json(
      { mode: "poll", intervalMs: 8000, message: "SSE indisponível neste ambiente — use polling." },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      send(`retry: 3000\n`);
      send(`event: ready\ndata: {"ok":true}\n\n`);

      const unsubscribe = subscribe((event: LiveEvent) => {
        send(`event: live\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const ping = setInterval(() => send(`: ping\n\n`), 20_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try { controller.close(); } catch { /* já encerrado */ }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
