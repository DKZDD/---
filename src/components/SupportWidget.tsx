"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { authHeaders } from "@/lib/session";
import { useLive } from "@/lib/useLive";

type Msg = { id: number; senderType: string; content: string; createdAt: string };

type ThreadResponse = {
  thread: { id: number; subject: string; status: string } | null;
  messages: Msg[];
};

export function SupportWidget() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [threadRes, settingsRes] = await Promise.all([
      fetch("/api/chat/thread", { cache: "no-store", headers: { ...authHeaders() } }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    if (threadRes.ok) {
      const data = (await threadRes.json()) as ThreadResponse;
      setMessages(data.messages);
      setThreadId(data.thread?.id ?? null);
    }
    if (settingsRes.ok) setSettings(await settingsRes.json());
  }, []);

  useEffect(() => { if (user) void load(); else void fetch("/api/settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).then(setSettings); }, [user, load]);
  useLive(() => { if (open && user) void load(); }, "chats");
  useLive(() => { void fetch("/api/settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).then(setSettings); }, "settings");

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/chat/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content: text }),
      });
      if (r.ok) {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  const cta = settings.chatCta || "Falar com a DuckeFlix";
  const welcome = settings.chatWelcome || "Oi! Fala comigo por aqui 👋";

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="focus-duck fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-extrabold text-black shadow-2xl hover:bg-brand-300">
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">{cta}</span>
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_25px_80px_rgba(0,0,0,0.75)]">
          <div className="border-b border-white/10 bg-panel-2 px-4 py-3">
            <p className="font-bold text-white">Chat DuckeFlix</p>
            <p className="text-xs text-zinc-500">Atendimento em tempo real</p>
          </div>
          {!user && !loading ? (
            <div className="space-y-3 p-4">
              <p className="text-sm text-zinc-300">{welcome}</p>
              <p className="text-xs text-zinc-500">Entre na sua conta para abrir um chat direto comigo.</p>
              <div className="flex gap-2">
                <a href="/entrar" className="focus-duck rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black">Entrar</a>
                <a href="/criar-conta" className="focus-duck rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200">Criar conta</a>
              </div>
            </div>
          ) : (
            <>
              <div className="thin-scrollbar max-h-[46vh] space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-zinc-300">{welcome}</div>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.senderType === 'user' ? 'bg-brand text-black' : 'bg-panel-2 text-zinc-100'}`}>
                      <p>{m.content}</p>
                      <p className={`mt-1 text-[10px] ${m.senderType === 'user' ? 'text-black/60' : 'text-zinc-500'}`}>{new Date(m.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={threadId ? "Digite sua mensagem..." : "Abra sua primeira conversa..."} className="focus-duck min-h-[56px] flex-1 resize-none rounded-xl border border-white/10 bg-panel-2 px-3 py-2 text-sm text-white" />
                  <button onClick={() => void send()} disabled={sending || !text.trim()} className="focus-duck inline-flex h-fit items-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-extrabold text-black disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
