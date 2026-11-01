"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/db/schema";
import { authHeaders } from "@/lib/session";
import { useLive } from "@/lib/useLive";
import { cn } from "@/lib/utils";

type FormState = {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  priceCents: string;
  durationDays: string;
  grantsVip: boolean;
  adFree: boolean;
  featured: boolean;
  isActive: boolean;
  sortOrder: string;
  color: string;
  benefitsText: string;
};

const EMPTY: FormState = {
  id: null,
  name: "",
  slug: "",
  description: "",
  priceCents: "0",
  durationDays: "30",
  grantsVip: false,
  adFree: false,
  featured: false,
  isActive: true,
  sortOrder: "0",
  color: "#71717a",
  benefitsText: "",
};

export function PlansPanel({ canManage }: { canManage: boolean }) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, settingsRes] = await Promise.all([
        fetch("/api/admin/plans", { cache: "no-store", headers: { ...authHeaders() } }),
        fetch("/api/admin/settings", { cache: "no-store", headers: { ...authHeaders() } }),
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLive(() => { void load(); }, "plans");
  useLive(() => { void load(); }, "settings");

  const ordered = useMemo(() => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents), [plans]);

  function openCreate() { setForm(EMPTY); setModalOpen(true); }
  function openEdit(p: SubscriptionPlan) {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceCents: String(p.priceCents),
      durationDays: String(p.durationDays),
      grantsVip: p.grantsVip,
      adFree: p.adFree,
      featured: p.featured,
      isActive: p.isActive,
      sortOrder: String(p.sortOrder),
      color: p.color,
      benefitsText: p.benefits.join("\n"),
    });
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        priceCents: Number(form.priceCents || 0),
        durationDays: Number(form.durationDays || 0),
        grantsVip: form.grantsVip,
        adFree: form.adFree,
        featured: form.featured,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder || 0),
        color: form.color,
        benefits: form.benefitsText.split("\n").map((x) => x.trim()).filter(Boolean),
      };
      const res = await fetch(form.id ? `/api/admin/plans/${form.id}` : "/api/admin/plans", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar plano.");
      toast.success(form.id ? "Plano atualizado!" : "Plano criado!");
      setModalOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(p: SubscriptionPlan) {
    if (confirmDeleteId !== p.id) {
      setConfirmDeleteId(p.id);
      setTimeout(() => setConfirmDeleteId((v) => (v === p.id ? null : v)), 3500);
      return;
    }
    setConfirmDeleteId(null);
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: "DELETE", headers: { ...authHeaders() } });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Falha ao excluir.");
    toast.success("Plano excluído.");
    void load();
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar configurações.");
      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSavingSettings(false);
    }
  }

  if (!canManage) return <p className="text-sm text-zinc-500">Seu cargo não pode gerenciar planos.</p>;
  if (loading) return <p className="text-sm text-zinc-500">Carregando planos…</p>;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">PIX / Configurações públicas</h2>
            <p className="text-xs text-zinc-500">Esses dados aparecem na página de assinatura e no chat.</p>
          </div>
          <button onClick={() => void saveSettings()} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black">
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["pixLabel", "Nome do PIX / banco"],
            ["pixKey", "Chave PIX"],
            ["chatWelcome", "Mensagem inicial do chat"],
            ["chatCta", "Texto do botão do chat"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
              <input
                value={settings[key] ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Planos de assinatura</h2>
            <p className="text-xs text-zinc-500">Crie quantos planos quiser: mensal, trimestral, anual, vitalício…</p>
          </div>
          <button onClick={openCreate} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black">
            <Plus className="h-4 w-4" />Novo plano
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-md px-2 py-1 text-xs font-extrabold" style={{ backgroundColor: p.color + '22', color: p.color }}>{p.name}</span>
                    {p.featured && <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-black">Destaque</span>}
                    {p.isSystem && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">Sistema</span>}
                  </div>
                  <p className="text-2xl font-black text-white">R$ {(p.priceCents / 100).toFixed(2)}</p>
                  <p className="text-xs text-zinc-500">{p.durationDays > 0 ? `${p.durationDays} dias` : "Vigência manual / vitalícia"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="focus-duck rounded-md p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><Crown className="h-4 w-4" /></button>
                  {!p.isSystem && (
                    <button onClick={() => void removePlan(p)} className={cn("focus-duck rounded-md p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400", confirmDeleteId === p.id && "bg-red-500/15 text-red-400")}> 
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{p.description || "Sem descrição."}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" />{b}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className={cn("rounded-full px-2 py-1 font-bold", p.grantsVip ? "bg-brand/15 text-brand" : "bg-white/10 text-zinc-500")}>VIP: {p.grantsVip ? "sim" : "não"}</span>
                <span className={cn("rounded-full px-2 py-1 font-bold", p.adFree ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-500")}>Sem ads: {p.adFree ? "sim" : "não"}</span>
                <span className={cn("rounded-full px-2 py-1 font-bold", p.isActive ? "bg-sky-500/15 text-sky-300" : "bg-white/10 text-zinc-500")}>{p.isActive ? "Ativo" : "Inativo"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button onClick={() => !saving && setModalOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 my-4 w-full max-w-2xl rounded-2xl bg-panel p-6 ring-1 ring-white/10">
            <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-bold text-white">{form.id ? "Editar plano" : "Novo plano"}</h3><button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome do plano" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
                <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="slug-do-plano" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
                <input value={form.priceCents} onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))} type="number" min={0} placeholder="Preço em centavos" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
                <input value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} type="number" min={0} placeholder="Duração em dias" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
                <input value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} type="number" min={0} placeholder="Ordem" className="focus-duck rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" />
                <div className="flex items-center gap-3"><input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} /><span className="text-sm text-zinc-400">Cor do plano</span></div>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição" className="focus-duck md:col-span-2 rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" rows={3} />
                <textarea value={form.benefitsText} onChange={(e) => setForm((f) => ({ ...f, benefitsText: e.target.value }))} placeholder="1 benefício por linha" className="focus-duck md:col-span-2 rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" rows={5} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  ["grantsVip", "Libera catálogo VIP"],
                  ["adFree", "Remove anúncios"],
                  ["featured", "Plano em destaque"],
                  ["isActive", "Plano ativo"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm font-semibold text-zinc-300">
                    {label}
                    <input type="checkbox" checked={form[key as keyof FormState] as boolean} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} className="h-4 w-4 accent-brand" />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-zinc-400">Cancelar</button>
                <button type="submit" disabled={saving} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-black">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar plano</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
