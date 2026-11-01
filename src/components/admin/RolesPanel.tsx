"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  NO_PERMISSIONS,
  type Permissions,
  type Role,
} from "@/db/schema";
import { authHeaders } from "@/lib/session";
import { cn } from "@/lib/utils";

type FormState = {
  id: number | null;
  name: string;
  level: string;
  color: string;
  icon: string;
  permissions: Permissions;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  level: "10",
  color: "#71717a",
  icon: "User",
  permissions: { ...NO_PERMISSIONS },
};

const ICON_OPTIONS = [
  "User", "Shield", "ShieldCheck", "Crown", "Gem", "Star",
  "Zap", "Eye", "Lock", "Sword",
];

export function RolesPanel({
  roles,
  callerLevel,
  callerPerms,
  onChanged,
}: {
  roles: Role[];
  callerLevel: number;
  callerPerms: Permissions;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...roles].sort((a, b) => b.level - a.level),
    [roles],
  );

  const canManageRoles = callerPerms.manageRoles;

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [modalOpen]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(r: Role) {
    setForm({
      id: r.id,
      name: r.name,
      level: String(r.level),
      color: r.color,
      icon: r.icon,
      permissions: { ...r.permissions },
    });
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const payload = {
        name: form.name,
        level: Number(form.level),
        color: form.color,
        icon: form.icon,
        permissions: form.permissions,
      };
      const res = await fetch(
        isEdit ? `/api/admin/roles/${form.id}` : "/api/admin/roles",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      toast.success(isEdit ? "Cargo atualizado!" : "Cargo criado!");
      setModalOpen(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(r: Role) {
    if (confirmDeleteId !== r.id) {
      setConfirmDeleteId(r.id);
      setTimeout(() => setConfirmDeleteId((v) => (v === r.id ? null : v)), 3500);
      return;
    }
    setConfirmDeleteId(null);
    const res = await fetch(`/api/admin/roles/${r.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Não foi possível excluir.");
      return;
    }
    toast.success(`Cargo "${r.name}" excluído.`);
    onChanged();
  }

  function togglePerm(key: keyof Permissions) {
    // não pode conceder permissão que o caller não tem
    if (!form.permissions[key] && !callerPerms[key]) {
      toast.error(`Você não tem a permissão "${PERMISSION_LABELS[key]}".`);
      return;
    }
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Hierarquia de Cargos</h2>
          <p className="text-xs text-zinc-500">
            Cargos com nível mais alto controlam os de nível abaixo. Seu nível: {callerLevel}.
          </p>
        </div>
        {canManageRoles && (
          <button
            onClick={openCreate}
            className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black transition hover:bg-brand-300"
          >
            <Plus className="h-4 w-4" />
            Novo cargo
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((r, i) => {
          const canEdit = canManageRoles && r.level < callerLevel && !r.isSystem;
          const canDelete = canManageRoles && r.level < callerLevel && !r.isSystem;
          const isAboveCaller = r.level >= callerLevel;

          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 transition",
                isAboveCaller
                  ? "border-white/5 bg-panel/50 opacity-70"
                  : "border-white/10 bg-panel",
              )}
            >
              {/* Posição na hierarquia */}
              <div className="flex flex-col items-center gap-1 text-zinc-600">
                {i > 0 && <ArrowUp className="h-3 w-3" />}
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold"
                  style={{ backgroundColor: r.color + "22", color: r.color }}
                >
                  {r.level}
                </span>
                {i < sorted.length - 1 && <ArrowDown className="h-3 w-3" />}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md px-2.5 py-1 text-sm font-extrabold"
                    style={{ backgroundColor: r.color + "22", color: r.color }}
                  >
                    {r.name}
                  </span>
                  {r.isSystem && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                      Sistema
                    </span>
                  )}
                  {isAboveCaller && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
                      Acima de você
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ALL_PERMISSIONS.filter((k) => r.permissions[k]).map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400"
                    >
                      {PERMISSION_LABELS[k]}
                    </span>
                  ))}
                  {ALL_PERMISSIONS.every((k) => !r.permissions[k]) && (
                    <span className="text-[10px] italic text-zinc-600">Sem permissões especiais</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={() => openEdit(r)}
                    aria-label="Editar cargo"
                    className="focus-duck rounded-md p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => removeRole(r)}
                    aria-label="Excluir cargo"
                    className={cn(
                      "focus-duck inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-bold transition",
                      confirmDeleteId === r.id
                        ? "bg-red-500/15 px-3 text-red-400"
                        : "text-zinc-500 hover:bg-red-500/10 hover:text-red-400",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmDeleteId === r.id && "Confirmar?"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            aria-label="Fechar"
            onClick={() => !saving && setModalOpen(false)}
            className="animate-fade-in fixed inset-0 cursor-default bg-black/75 backdrop-blur-sm"
          />
          <div className="animate-modal relative z-10 my-4 w-full max-w-lg overflow-hidden rounded-2xl bg-panel shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
                <Shield className="h-5 w-5 text-brand" />
                {form.id ? "Editar cargo" : "Novo cargo"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="focus-duck rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="r-name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Nome do cargo *
                  </label>
                  <input
                    id="r-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Editor, Suporte..."
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="r-level" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Nível hierárquico (0–{callerLevel - 1})
                  </label>
                  <input
                    id="r-level"
                    type="number"
                    required
                    min={0}
                    max={callerLevel - 1}
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  />
                  <p className="text-[10px] text-zinc-600">
                    Quanto mais alto, mais poder. Máximo que você pode definir: {callerLevel - 1}.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="r-color" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Cor
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="r-color"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
                    />
                    <span
                      className="rounded-md px-3 py-1 text-xs font-bold"
                      style={{ backgroundColor: form.color + "22", color: form.color }}
                    >
                      {form.name || "Preview"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Ícone
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition",
                          form.icon === ic
                            ? "border-brand bg-brand/15 text-brand"
                            : "border-white/10 text-zinc-400 hover:border-zinc-500",
                        )}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permissões */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Permissões
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((k) => {
                    const has = form.permissions[k];
                    const callerHas = callerPerms[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => togglePerm(k)}
                        disabled={!callerHas}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition",
                          has
                            ? "border-brand/40 bg-brand/10 text-brand"
                            : "border-white/10 text-zinc-500",
                          !callerHas && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition",
                            has
                              ? "border-brand bg-brand text-black"
                              : "border-zinc-600",
                          )}
                        >
                          {has && <Check className="h-3 w-3" />}
                        </span>
                        {PERMISSION_LABELS[k]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="focus-duck rounded-md px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.id ? "Salvar" : "Criar cargo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
