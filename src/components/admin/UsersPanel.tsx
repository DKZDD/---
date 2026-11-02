"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Copy,
  Crown,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Role, SafeUser, SubscriptionPlan } from "@/db/schema";
import { authHeaders } from "@/lib/session";
import { useLive } from "@/lib/useLive";
import { cn } from "@/lib/utils";

type CreatedSecret = { email: string; qr: string; secret: string } | null;

export function UsersPanel({
  users,
  roles,
  currentAdmin,
  onChanged,
}: {
  users: SafeUser[];
  roles: Role[];
  currentAdmin: SafeUser;
  onChanged: () => void;
}) {
  const currentAdminId = currentAdmin.id;
  const callerLevel = currentAdmin.roleLevel;

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [createdSecret, setCreatedSecret] = useState<CreatedSecret>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    subscriptionPlanId: "",
  });
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/plans", { cache: "no-store", headers: { ...authHeaders() } });
      if (r.ok) setPlans(await r.json());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => { void loadPlans(); }, [loadPlans]);
  useLive(() => { void loadPlans(); }, "plans");

  const assignableRoles = useMemo(
    () => roles.filter((r) => r.level < callerLevel).sort((a, b) => b.level - a.level),
    [roles, callerLevel],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q) ||
        u.subscriptionPlanName.toLowerCase().includes(q),
    );
  }, [users, query]);

  useEffect(() => {
    if (!modalOpen && !createdSecret) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [modalOpen, createdSecret]);

  async function patchUser(id: number, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não foi possível atualizar.");
        return null;
      }
      onChanged();
      return data;
    } catch {
      toast.error("Erro de conexão.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(u: SafeUser, roleId: number) {
    const role = roles.find((r) => r.id === roleId);
    const data = await patchUser(u.id, { roleId });
    if (data) {
      if (data.qr) {
        setCreatedSecret({ email: u.email, qr: data.qr, secret: data.secret });
        toast.success("Cargo atualizado! Configure o 2FA do novo admin.");
      } else {
        toast.success(`Cargo de ${u.name || u.email} → ${role?.name ?? "atualizado"}`);
      }
    }
  }

  async function changePlan(u: SafeUser, subscriptionPlanId: number | null) {
    const plan = plans.find((p) => p.id === subscriptionPlanId);
    const data = await patchUser(u.id, { subscriptionPlanId });
    if (data) {
      toast.success(`Assinatura de ${u.name || u.email} → ${plan?.name ?? "Grátis"}`);
    }
  }

  async function toggleSuspend(u: SafeUser) {
    const suspend = u.status !== "suspended";
    const data = await patchUser(u.id, { status: suspend ? "suspended" : "active" });
    if (data) toast.success(suspend ? "Conta suspensa." : "Conta reativada.");
  }

  async function removeUser(u: SafeUser) {
    if (confirmDeleteId !== u.id) {
      setConfirmDeleteId(u.id);
      setTimeout(() => setConfirmDeleteId((v) => (v === u.id ? null : v)), 3500);
      return;
    }
    setConfirmDeleteId(null);
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: { ...authHeaders() } });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não foi possível excluir.");
        return;
      }
      toast.success("Conta excluída.");
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...form,
          roleId: form.roleId ? Number(form.roleId) : null,
          subscriptionPlanId: form.subscriptionPlanId ? Number(form.subscriptionPlanId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não foi possível criar a conta.");
        return;
      }
      toast.success("Conta criada com sucesso!");
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", roleId: "", subscriptionPlanId: "" });
      if (data.qr) {
        setCreatedSecret({ email: form.email, qr: data.qr, secret: data.secret });
      }
      onChanged();
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, cargo ou assinatura..."
            className="focus-duck w-80 rounded-md border border-white/10 bg-panel py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} de {users.length} contas</span>
        {currentAdmin.permissions.manageUsers && (
          <button onClick={() => setModalOpen(true)} className="focus-duck ml-auto inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black transition hover:bg-brand-300"><Plus className="h-4 w-4" />Nova conta</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-panel">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-semibold">Conta</th>
              <th className="px-4 py-3 font-semibold">Cargo</th>
              <th className="px-4 py-3 font-semibold">Assinatura</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 font-semibold">Criada em</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentAdminId;
              const busy = busyId === u.id;
              const canModify = !isSelf && u.roleLevel < callerLevel;

              return (
                <tr key={u.id} className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold uppercase" style={{ backgroundColor: u.roleColor + '22', color: u.roleColor }}>
                        {(u.name || u.email).slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-white">
                          {u.name || '—'}
                          {isSelf && <span className="rounded bg-white/10 px-1.5 text-[10px] font-bold text-zinc-300">você</span>}
                        </p>
                        <p className="max-w-[230px] truncate text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canModify && currentAdmin.permissions.assignRoles ? (
                      <select value={u.roleId ?? ''} onChange={(e) => { const val = Number(e.target.value); if (val) void changeRole(u, val); }} className="focus-duck rounded-md border border-white/10 bg-panel-2 px-2 py-1 text-xs font-bold" style={{ color: u.roleColor }}>
                        <option value={u.roleId ?? ''}>{u.roleName}</option>
                        {assignableRoles.filter((r) => r.id !== u.roleId).map((r) => <option key={r.id} value={r.id}>{r.name} (nv.{r.level})</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: u.roleColor + '22', color: u.roleColor }}>{u.roleName}<span className="text-[10px] opacity-60">nv.{u.roleLevel}</span></span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canModify && currentAdmin.permissions.managePlans ? (
                      <select value={u.subscriptionPlanId ?? ''} onChange={(e) => { const raw = e.target.value; void changePlan(u, raw ? Number(raw) : null); }} className="focus-duck rounded-md border border-white/10 bg-panel-2 px-2 py-1 text-xs font-bold text-zinc-200">
                        <option value={u.subscriptionPlanId ?? ''}>{u.subscriptionPlanName}</option>
                        <option value="">Grátis</option>
                        {plans.filter((p) => p.id !== u.subscriptionPlanId && p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    ) : (
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', u.isPaid ? 'bg-brand/15 text-brand' : 'bg-white/10 text-zinc-400')}>
                        <Wallet className="h-3.5 w-3.5" />{u.subscriptionPlanName}
                      </span>
                    )}
                    {u.subscriptionEndsAt && (
                      <p className="mt-1 text-[10px] text-zinc-600">até {new Date(u.subscriptionEndsAt).toLocaleDateString('pt-BR')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400"><Ban className="h-3.5 w-3.5" />Suspensa</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" />Ativa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin text-brand" />}
                      {canModify && currentAdmin.permissions.manageVip && (
                        <button onClick={() => changePlan(u, u.isVip ? null : plans.find((p) => p.grantsVip && p.isActive)?.id ?? null)} disabled={busy} title={u.isVip ? 'Remover VIP' : 'Conceder VIP'} className={cn('focus-duck rounded-md p-2 transition disabled:opacity-40', u.isVip ? 'bg-brand/15 text-brand' : 'text-zinc-500 hover:bg-white/10 hover:text-brand')}>
                          <Crown className="h-4 w-4" />
                        </button>
                      )}
                      {canModify && currentAdmin.permissions.manageUsers && (
                        <button onClick={() => toggleSuspend(u)} disabled={busy} title={u.status === 'suspended' ? 'Reativar conta' : 'Suspender conta'} className={cn('focus-duck rounded-md p-2 transition disabled:opacity-30', u.status === 'suspended' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-500 hover:bg-amber-500/10 hover:text-amber-400')}>
                          {u.status === 'suspended' ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                      )}
                      {canModify && currentAdmin.permissions.manageUsers && (
                        <button onClick={() => removeUser(u)} disabled={busy} className={cn('focus-duck inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-bold transition disabled:opacity-30', confirmDeleteId === u.id ? 'bg-red-500/15 px-3 text-red-400' : 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400')}>
                          <Trash2 className="h-4 w-4" />{confirmDeleteId === u.id && 'Confirmar?'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-12 text-center text-sm text-zinc-500">Nenhuma conta encontrada.</p>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button aria-label="Fechar" onClick={() => !saving && setModalOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 my-4 w-full max-w-lg overflow-hidden rounded-2xl bg-panel shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white"><UserCog className="h-5 w-5 text-brand" />Nova conta</h2>
              <button onClick={() => setModalOpen(false)} className="focus-duck rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createUser} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Nome *</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" /></div>
                <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">E-mail *</label><input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" /></div>
                <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Senha * (mín. 8)</label><input type="text" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Cargo</label><select value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"><option value="">Membro (padrão)</option>{assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.name} (nv.{r.level})</option>)}</select></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Assinatura</label><select value={form.subscriptionPlanId} onChange={(e) => setForm((f) => ({ ...f, subscriptionPlanId: e.target.value }))} className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"><option value="">Grátis</option>{plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="focus-duck rounded-md px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:text-white">Cancelar</button><button type="submit" disabled={saving} className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Criar conta</button></div>
            </form>
          </div>
        </div>
      )}

      {createdSecret && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-panel p-6 text-center shadow-2xl ring-1 ring-white/10">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-brand" />
            <h3 className="text-lg font-bold text-white">2FA do novo administrador</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">Mostre este QR para <span className="text-brand">{createdSecret.email}</span> escanear no Authenticator.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={createdSecret.qr} alt="QR Code" className="mx-auto my-4 w-44 rounded-xl bg-white p-2" />
            <button onClick={() => { void navigator.clipboard.writeText(createdSecret.secret); toast.success('Chave copiada!'); }} className="focus-duck mx-auto mb-4 flex max-w-full items-center gap-2 rounded-md border border-white/10 bg-panel-2 px-3 py-2 font-mono text-[11px] text-brand transition hover:border-brand/40"><span className="break-all">{createdSecret.secret}</span><Copy className="h-3.5 w-3.5 shrink-0" /></button>
            <button onClick={() => setCreatedSecret(null)} className="focus-duck w-full rounded-md bg-brand py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300">Já anotei, fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
