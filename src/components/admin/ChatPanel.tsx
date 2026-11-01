"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { authHeaders } from "@/lib/session";
import { useLive } from "@/lib/useLive";

type ThreadListItem = {
  id: number;
  userId: number;
  subject: string;
  status: string;
  unreadUser: number;
  unreadAdmin: number;
  lastMessageAt: string;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
};

type Message = {
  id: number;
  threadId: number;
  senderType: string;
  senderUserId: number | null;
  content: string;
  presetId: number | null;
  createdAt: string;
};

type Reply = { id: number; title: string; content: string; sortOrder: number; active: boolean };

export function ChatPanel({ canManage }: { canManage: boolean }) {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [presetTitle, setPresetTitle] = useState("");
  const [presetContent, setPresetContent] = useState("");

  const loadThreads = useCallback(async () => {
    const r = await fetch("/api/admin/chats", { cache: "no-store", headers: { ...authHeaders() } });
    if (r.ok) {
      const data = await r.json();
      setThreads(data);
      if (!selected && data[0]) setSelected(data[0].id);
    }
  }, [selected]);

  const loadMessages = useCallback(async (id: number) => {
    const r = await fetch(`/api/admin/chats/${id}/messages`, { cache: "no-store", headers: { ...authHeaders() } });
    if (r.ok) {
      const data = await r.json();
      setMessages(data.messages);
    }
  }, []);

  const loadReplies = useCallback(async () => {
    const r = await fetch("/api/admin/canned-replies", { cache: "no-store", headers: { ...authHeaders() } });
    if (r.ok) setReplies(await r.json());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadThreads(), loadReplies()]);
    } finally {
      setLoading(false);
    }
  }, [loadThreads, loadReplies]);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => { if (selected) void loadMessages(selected); }, [selected, loadMessages]);
  useLive(() => { void loadThreads(); if (selected) void loadMessages(selected); }, "chats");

  const selectedThread = useMemo(() => threads.find((t) => t.id === selected) ?? null, [threads, selected]);

  async function send(payload: Record<string, unknown>) {
    if (!selected) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/chats/${selected}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha ao enviar.");
      setMessage("");
      await loadThreads();
      await loadMessages(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setSending(false);
    }
  }

  async function createPreset(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/canned-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title: presetTitle, content: presetContent }),
    });
    const data = await r.json();
    if (!r.ok) return toast.error(data.error || "Falha ao salvar resposta pronta.");
    toast.success("Resposta pronta criada!");
    setPresetTitle(""); setPresetContent("");
    void loadReplies();
  }

  if (!canManage) return <p className="text-sm text-zinc-500">Seu cargo não pode atender o chat.</p>;
  if (loading) return <p className="text-sm text-zinc-500">Carregando conversas…</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-panel p-4">
        <div>
          <h2 className="text-lg font-bold text-white">Conversas</h2>
          <p className="text-xs text-zinc-500">Atenda manualmente ou use respostas prontas.</p>
        </div>
        <div className="space-y-2">
          {threads.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected === t.id ? 'border-brand/40 bg-brand/10' : 'border-white/10 bg-panel-2 hover:border-zinc-500'}`}>
              <p className="truncate text-sm font-bold text-white">{t.user?.name || t.user?.email || 'Usuário'}</p>
              <p className="truncate text-xs text-zinc-500">{t.subject}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                <span>{new Date(t.lastMessageAt).toLocaleString('pt-BR')}</span>
                {t.unreadAdmin > 0 && <span className="rounded-full bg-brand px-2 py-0.5 font-bold text-black">{t.unreadAdmin} novas</span>}
              </div>
            </button>
          ))}
          {threads.length === 0 && <p className="text-sm text-zinc-500">Nenhuma conversa aberta ainda.</p>}
        </div>

        <form onSubmit={createPreset} className="space-y-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Plus className="h-4 w-4 text-brand" />Resposta pronta</div>
          <input value={presetTitle} onChange={(e) => setPresetTitle(e.target.value)} placeholder="Título curto" className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2 text-sm text-white" />
          <textarea value={presetContent} onChange={(e) => setPresetContent(e.target.value)} placeholder="Mensagem pronta" rows={3} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2 text-sm text-white" />
          <button className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-extrabold text-black"><Plus className="h-3.5 w-3.5" />Salvar resposta</button>
        </form>
      </aside>

      <section className="rounded-2xl border border-white/10 bg-panel p-4">
        {selectedThread ? (
          <>
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <MessageCircle className="h-5 w-5 text-brand" />
              <div>
                <p className="font-bold text-white">{selectedThread.user?.name || selectedThread.user?.email}</p>
                <p className="text-xs text-zinc-500">{selectedThread.user?.email}</p>
              </div>
              <span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-zinc-400">{selectedThread.status}</span>
            </div>

            <div className="thin-scrollbar max-h-[50vh] space-y-3 overflow-y-auto pr-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${m.senderType === 'admin' ? 'bg-brand text-black' : 'bg-panel-2 text-zinc-100'}`}>
                    <p>{m.content}</p>
                    <p className={`mt-1 text-[10px] ${m.senderType === 'admin' ? 'text-black/60' : 'text-zinc-500'}`}>{new Date(m.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-zinc-500">Nenhuma mensagem ainda.</p>}
            </div>

            {replies.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Respostas prontas</p>
                <div className="flex flex-wrap gap-2">
                  {replies.filter((r) => r.active).map((r) => (
                    <button key={r.id} onClick={() => void send({ presetId: r.id })} className="focus-duck rounded-full border border-white/10 bg-panel-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-brand/40 hover:text-brand">
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); void send({ content: message }); }} className="mt-4 flex gap-2 border-t border-white/10 pt-4">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Digite uma resposta livre..." className="focus-duck min-h-[76px] flex-1 resize-none rounded-xl border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
              <button disabled={sending || !message.trim()} className="focus-duck inline-flex h-fit items-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-extrabold text-black disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar</button>
            </form>
          </>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-zinc-500"><MessageCircle className="h-10 w-10 text-zinc-700" /><p>Selecione uma conversa para responder.</p></div>
        )}
      </section>
    </div>
  );
}
