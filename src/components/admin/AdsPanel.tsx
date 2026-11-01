"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Ad } from "@/db/schema";
import { authHeaders } from "@/lib/session";
import { useLive } from "@/lib/useLive";

export function AdsPanel({ canManage }: { canManage: boolean }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", body: "", imageUrl: "", targetUrl: "", cta: "Saiba mais", placement: "home", targetAudience: "free", active: true, sortOrder: "0" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ads", { cache: "no-store", headers: { ...authHeaders() } });
      if (r.ok) setAds(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLive(() => { void load(); }, "ads");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder || 0) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar anúncio.");
      toast.success("Anúncio criado!");
      setOpen(false);
      setForm({ title: "", body: "", imageUrl: "", targetUrl: "", cta: "Saiba mais", placement: "home", targetAudience: "free", active: true, sortOrder: "0" });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  async function removeAd(id: number) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId((v) => (v === id ? null : v)), 3000); return; }
    setConfirmDeleteId(null);
    const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE", headers: { ...authHeaders() } });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Falha ao excluir.");
    toast.success("Anúncio excluído.");
    void load();
  }

  if (!canManage) return <p className="text-sm text-zinc-500">Seu cargo não pode gerenciar anúncios.</p>;
  if (loading) return <p className="text-sm text-zinc-500">Carregando anúncios…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Anúncios para usuários Free</h2>
          <p className="text-xs text-zinc-500">Exibidos só para quem não possui plano sem anúncios.</p>
        </div>
        <button onClick={() => setOpen(true)} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black"><Plus className="h-4 w-4" />Novo anúncio</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ads.map((ad) => (
          <div key={ad.id} className="rounded-2xl border border-white/10 bg-panel p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{ad.title}</h3>
                <p className="text-xs text-zinc-500">{ad.placement} · {ad.targetAudience}</p>
              </div>
              <button onClick={() => void removeAd(ad.id)} className="text-zinc-500 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-400">{ad.body}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
              <span>impressões: {ad.impressions}</span>
              <span>cliques: {ad.clicks}</span>
              <span>{ad.active ? "ativo" : "inativo"}</span>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button onClick={() => !saving && setOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 my-4 w-full max-w-xl rounded-2xl bg-panel p-6 ring-1 ring-white/10">
            <div className="mb-5 flex items-center justify-between"><h3 className="inline-flex items-center gap-2 text-lg font-bold text-white"><Megaphone className="h-5 w-5 text-brand" />Novo anúncio</h3><button onClick={() => setOpen(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
              <input value={form.cta} onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))} placeholder="CTA" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
              <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="Imagem (URL)" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white md:col-span-2" />
              <input value={form.targetUrl} onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))} placeholder="Link de destino" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white md:col-span-2" />
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Texto do anúncio" rows={4} className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white md:col-span-2" />
              <select value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))} className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"><option value="home">Home</option><option value="search">Busca</option><option value="vip">Página VIP</option><option value="player">Player</option></select>
              <select value={form.targetAudience} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))} className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"><option value="free">Usuários Free</option><option value="all">Todos</option></select>
              <input value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} type="number" min={0} placeholder="Ordem" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
              <label className="flex items-center justify-between rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm font-semibold text-zinc-300">Ativo<input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 accent-brand" /></label>
              <div className="md:col-span-2 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-zinc-400">Cancelar</button><button type="submit" disabled={saving} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-black">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Criar anúncio</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
