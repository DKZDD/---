import { subscribe, type LiveEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stream SSE: mantém a conexão aberta e envia um evento sempre que o
 * catálogo ou as contas mudam — é o que faz a interface atualizar em
 * tempo real, sem o usuário recarregar a página.
 */
export async function GET(request: Request) {
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

      // confirma a conexão imediatamente
      send(`retry: 3000\n`);
      send(`event: ready\ndata: {"ok":true}\n\n`);

      const unsubscribe = subscribe((event: LiveEvent) => {
        send(`event: live\ndata: ${JSON.stringify(event)}\n\n`);
      });

      // ping periódico evita que proxies encerrem a conexão ociosa
      const ping = setInterval(() => send(`: ping\n\n`), 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* já encerrado */
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
