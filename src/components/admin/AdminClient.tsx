"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Crown,
  Eye,
  Film,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Loader2,
  LogOut,
  MessageCircle,
  Megaphone,
  Pencil,
  Plus,
  Radio,
  Search,
  Shield,
  Star,
  Trash2,
  UploadCloud,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Role, SafeUser, Video } from "@/db/schema";
import { Logo } from "@/components/Logo";
import { AdsPanel } from "@/components/admin/AdsPanel";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { PlansPanel } from "@/components/admin/PlansPanel";
import { RolesPanel } from "@/components/admin/RolesPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import {
  authHeaders,
  clearToken,
  getStoredToken,
  persistToken,
} from "@/lib/session";
import { useLive } from "@/lib/useLive";
import { cn, formatBytes, formatDuration, formatViews } from "@/lib/utils";

const CATEGORIES = [
  "Ação", "Aventura", "Animação", "Comédia", "Documentário",
  "Drama", "Fantasia", "Ficção Científica", "Romance", "Terror", "Outros",
];
const RATINGS = ["L", "10", "12", "14", "16", "18"];

type FormState = {
  id: number | null;
  title: string;
  description: string;
  category: string;
  year: string;
  durationSec: string;
  rating: string;
  videoUrl: string;
  thumbUrl: string;
  featured: boolean;
  vipOnly: boolean;
};

const EMPTY_FORM: FormState = {
  id: null, title: "", description: "", category: "Outros",
  year: String(new Date().getFullYear()), durationSec: "", rating: "L",
  videoUrl: "", thumbUrl: "", featured: false, vipOnly: false,
};

function uploadFile(
  file: File,
  kind: "video" | "thumb",
  onProgress: (pct: number) => void,
): Promise<{ url: string; name: string; size: number }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    // Desativa o timeout interno para envios de arquivos enormes
    xhr.timeout = 0;
    const token = getStoredToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(res);
        else reject(new Error(res.error || "Falha no upload."));
      } catch {
        reject(new Error("Resposta inválida do servidor."));
      }
    };
    xhr.onerror = () => reject(new Error("Erro de rede durante o upload."));
    xhr.send(fd);
  });
}

export function AdminClient({
  initialVideos,
  admin,
  authToken = "",
}: {
  initialVideos: Video[];
  admin: SafeUser;
  authToken?: string;
}) {
  const [tab, setTab] = useState<"catalogo" | "usuarios" | "cargos" | "planos" | "anuncios" | "chat">("catalogo");
  const [videos, setVideos] = useState(initialVideos);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [live, setLive] = useState(false);

  // handoff: guarda o token vindo pela URL e limpa o endereço
  useEffect(() => {
    if (!authToken) return;
    persistToken(authToken);
    try {
      window.history.replaceState(null, "", "/DuckeScripts");
    } catch {
      /* navegadores restritos */
    }
  }, [authToken]);

  const loadVideos = useCallback(async () => {
    try {
      const r = await fetch("/api/videos", { cache: "no-store" });
      if (r.ok) setVideos(await r.json());
    } catch {
      /* mantém o estado atual */
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/users", {
        cache: "no-store",
        headers: { ...authHeaders() },
      });
      if (r.ok) setUsers(await r.json());
    } catch {
      /* mantém o estado atual */
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/roles", {
        cache: "no-store",
        headers: { ...authHeaders() },
      });
      if (r.ok) setAllRoles(await r.json());
    } catch {
      /* mantém o estado atual */
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadRoles();
  }, [loadUsers, loadRoles]);

  // ---- tempo real: recarrega o que mudou no servidor ----
  useLive(
    useCallback(
      (ev) => {
        setLive(true);
        if (ev.type === "videos") void loadVideos();
        if (ev.type === "users") {
          void loadUsers();
          void loadRoles();
        }
      },
      [loadVideos, loadUsers],
    ),
  );

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sourceTab, setSourceTab] = useState<"link" | "upload">("link");
  const [saving, setSaving] = useState(false);
  const [videoUpload, setVideoUpload] = useState<{ progress: number; name: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(
    () => ({
      total: videos.length,
      views: videos.reduce((a, v) => a + v.views, 0),
      vipVideos: videos.filter((v) => v.vipOnly).length,
      vipUsers: users.filter((u) => u.isVip).length,
      accounts: users.length,
    }),
    [videos, users],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(
      (v) => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q),
    );
  }, [videos, query]);

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
    setSourceTab("link");
    setUploadedFile(null);
    setModalOpen(true);
  }

  function openEdit(v: Video) {
    setForm({
      id: v.id, title: v.title, description: v.description, category: v.category,
      year: v.year ? String(v.year) : "", durationSec: v.durationSec ? String(v.durationSec) : "",
      rating: v.rating, videoUrl: v.videoUrl, thumbUrl: v.thumbUrl ?? "",
      featured: v.featured, vipOnly: v.vipOnly,
    });
    const isUpload = v.source === "upload";
    setSourceTab(isUpload ? "upload" : "link");
    setUploadedFile(isUpload ? { name: "Arquivo enviado anteriormente", size: 0 } : null);
    setModalOpen(true);
  }

  async function handleVideoFile(file: File) {
    try {
      setVideoUpload({ progress: 0, name: file.name });
      const res = await uploadFile(file, "video", (pct) =>
        setVideoUpload({ progress: pct, name: file.name }),
      );
      setUploadedFile({ name: res.name, size: res.size });
      setForm((f) => ({
        ...f,
        videoUrl: res.url,
        title: f.title || res.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success("Vídeo enviado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setVideoUpload(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function handleThumbFile(file: File) {
    try {
      setThumbUploading(true);
      const res = await uploadFile(file, "thumb", () => {});
      setForm((f) => ({ ...f, thumbUrl: res.url }));
      toast.success("Capa enviada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload da capa.");
    } finally {
      setThumbUploading(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.videoUrl.trim()) {
      toast.error("Adicione o vídeo por link/URL ou por upload.");
      return;
    }
    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const payload = {
        title: form.title, description: form.description, category: form.category,
        videoUrl: form.videoUrl, thumbUrl: form.thumbUrl || null,
        year: form.year ? Number(form.year) : null,
        durationSec: form.durationSec ? Number(form.durationSec) : null,
        rating: form.rating, featured: form.featured, vipOnly: form.vipOnly,
        source: sourceTab === "upload" ? "upload" : "url",
      };
      const res = await fetch(isEdit ? `/api/videos/${form.id}` : "/api/videos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      toast.success(isEdit ? "Vídeo atualizado!" : "Vídeo adicionado ao catálogo!");
      setModalOpen(false);
      setUploadedFile(null);
      void loadVideos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function patchVideo(v: Video, payload: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/videos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    toast.success(msg);
    void loadVideos();
  }

  async function removeVideo(v: Video) {
    if (confirmDeleteId !== v.id) {
      setConfirmDeleteId(v.id);
      setTimeout(() => setConfirmDeleteId((id) => (id === v.id ? null : id)), 3500);
      return;
    }
    setConfirmDeleteId(null);
    const res = await fetch(`/api/videos/${v.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success(`"${v.title}" excluído do catálogo.`);
    void loadVideos();
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { ...authHeaders() } });
    } catch {
      /* segue com o logout local */
    }
    clearToken();
    toast.success("Sessão encerrada. Até logo!");
    setTimeout(() => window.location.assign("/DuckeScripts/login"), 300);
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-[4vw]">
          <Link
            href="/"
            className="focus-duck inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Site</span>
          </Link>
          <div className="flex items-baseline gap-2.5">
            <Logo className="[&_span]:text-xl" />
            <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-black">
              Admin
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span
              title={live ? "Sincronizado em tempo real" : "Conectando ao tempo real"}
              className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 md:inline-flex"
            >
              <Radio className={cn("h-3.5 w-3.5", live && "animate-pulse")} />
              Ao vivo
            </span>
            <span className="hidden text-[11px] font-semibold text-zinc-400 lg:inline">
              {admin.email}
            </span>
            <button
              onClick={() => void logout()}
              aria-label="Sair"
              className="focus-duck inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:border-red-400/50 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        <div className="flex gap-1 px-[4vw] pb-2">
          {([
            ["catalogo", "Catálogo", Film],
            ["usuarios", "Usuários", Users],
            ["cargos", "Cargos", Shield],
            ["planos", "Planos", Wallet],
            ["anuncios", "Anúncios", Megaphone],
            ["chat", "Chat", MessageCircle],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "focus-duck inline-flex items-center gap-2 rounded-t-md px-4 py-2 text-sm font-bold transition",
                tab === key
                  ? "border-b-2 border-brand text-brand"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-8 px-[4vw] py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard icon={<Film className="h-5 w-5" />} label="Títulos" value={String(stats.total)} />
          <StatCard icon={<Eye className="h-5 w-5" />} label="Visualizações" value={formatViews(stats.views)} />
          <StatCard icon={<Crown className="h-5 w-5" />} label="Títulos VIP" value={String(stats.vipVideos)} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Contas" value={String(stats.accounts)} />
          <StatCard icon={<Crown className="h-5 w-5" />} label="Assinantes VIP" value={String(stats.vipUsers)} />
        </div>

        {tab === "cargos" ? (
          <RolesPanel
            roles={allRoles}
            callerLevel={admin.roleLevel}
            callerPerms={admin.permissions}
            onChanged={loadRoles}
          />
        ) : tab === "usuarios" ? (
          <UsersPanel
            users={users}
            roles={allRoles}
            currentAdmin={admin}
            onChanged={() => { void loadUsers(); void loadRoles(); }}
          />
        ) : tab === "planos" ? (
          <PlansPanel canManage={admin.permissions.managePlans || admin.permissions.manageSettings} />
        ) : tab === "anuncios" ? (
          <AdsPanel canManage={admin.permissions.manageAds} />
        ) : tab === "chat" ? (
          <ChatPanel canManage={admin.permissions.manageChat} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar no catálogo..."
                  className="focus-duck w-64 rounded-md border border-white/10 bg-panel py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500"
                />
              </div>
              <span className="text-xs text-zinc-500">
                {filtered.length} de {videos.length} títulos
              </span>
              <button
                onClick={openCreate}
                className="focus-duck ml-auto inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-black transition hover:bg-brand-300"
              >
                <Plus className="h-4 w-4" />
                Novo vídeo
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-20 text-center">
                <Film className="h-10 w-10 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                  {videos.length === 0 ? "Nenhum vídeo cadastrado ainda." : "Nenhum resultado."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-panel">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Título</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Duração</th>
                      <th className="px-4 py-3 font-semibold">Fonte</th>
                      <th className="px-4 py-3 font-semibold">Views</th>
                      <th className="px-4 py-3 font-semibold">VIP</th>
                      <th className="px-4 py-3 font-semibold">Destaque</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => (
                      <tr key={v.id} className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded bg-panel-2">
                              {v.thumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.thumbUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Film className="h-4 w-4 text-zinc-600" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate font-semibold text-white">{v.title}</p>
                              <p className="max-w-[220px] truncate text-xs text-zinc-500">
                                {v.description || "Sem descrição"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                            {v.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {v.durationSec ? formatDuration(v.durationSec) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {v.source === "upload" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                              <HardDrive className="h-3.5 w-3.5" />Upload
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400">
                              <Link2 className="h-3.5 w-3.5" />Link
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{formatViews(v.views)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              patchVideo(v, { vipOnly: !v.vipOnly },
                                !v.vipOnly ? "Agora é exclusivo VIP 👑" : "Liberado para todos.")
                            }
                            aria-label="Alternar exclusividade VIP"
                            title={v.vipOnly ? "Exclusivo VIP — clique para liberar" : "Tornar exclusivo VIP"}
                            className={cn(
                              "focus-duck rounded-full p-2 transition",
                              v.vipOnly ? "bg-brand/15 text-brand" : "text-zinc-600 hover:bg-white/10 hover:text-brand",
                            )}
                          >
                            <Crown className={cn("h-4 w-4", v.vipOnly && "fill-brand")} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              patchVideo(v, { featured: !v.featured },
                                !v.featured ? `"${v.title}" é o novo destaque.` : "Destaque removido.")
                            }
                            aria-label="Alternar destaque"
                            className={cn(
                              "focus-duck rounded-full p-2 transition",
                              v.featured ? "bg-brand/15 text-brand" : "text-zinc-600 hover:bg-white/10 hover:text-zinc-300",
                            )}
                          >
                            <Star className={cn("h-4 w-4", v.featured && "fill-brand")} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(v)}
                              aria-label={`Editar ${v.title}`}
                              className="focus-duck rounded-md p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeVideo(v)}
                              aria-label={`Excluir ${v.title}`}
                              className={cn(
                                "focus-duck inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-bold transition",
                                confirmDeleteId === v.id
                                  ? "bg-red-500/15 px-3 text-red-400"
                                  : "text-zinc-400 hover:bg-red-500/10 hover:text-red-400",
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                              {confirmDeleteId === v.id && "Confirmar?"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de vídeo */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            aria-label="Fechar"
            onClick={() => !saving && setModalOpen(false)}
            className="animate-fade-in fixed inset-0 cursor-default bg-black/75 backdrop-blur-sm"
          />
          <div className="animate-modal relative z-10 my-4 w-full max-w-2xl overflow-hidden rounded-2xl bg-panel shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                {form.id !== null ? "Editar vídeo" : "Novo vídeo"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Fechar formulário"
                className="focus-duck rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-panel-2 p-1">
                <button
                  type="button"
                  onClick={() => setSourceTab("link")}
                  className={cn(
                    "focus-duck inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition",
                    sourceTab === "link" ? "bg-brand text-black" : "text-zinc-400 hover:text-white",
                  )}
                >
                  <Link2 className="h-4 w-4" />Link / URL
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab("upload")}
                  className={cn(
                    "focus-duck inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition",
                    sourceTab === "upload" ? "bg-brand text-black" : "text-zinc-400 hover:text-white",
                  )}
                >
                  <UploadCloud className="h-4 w-4" />Upload do PC
                </button>
              </div>

              {sourceTab === "link" && (
                <div className="space-y-1.5">
                  <label htmlFor="video-url" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    URL do vídeo
                  </label>
                  <input
                    id="video-url"
                    value={form.videoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                    placeholder="https://exemplo.com/meu-filme.mp4"
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>
              )}

              {sourceTab === "upload" && (
                <div className="space-y-3">
                  {videoUpload && (
                    <div className="space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="max-w-[70%] truncate font-medium text-zinc-200">{videoUpload.name}</span>
                        <span className="font-bold tabular-nums text-brand">{videoUpload.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${videoUpload.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {!videoUpload && uploadedFile && form.videoUrl && (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{uploadedFile.name}</p>
                        {uploadedFile.size > 0 && (
                          <p className="text-[11px] text-zinc-500">{formatBytes(uploadedFile.size)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setForm((f) => ({ ...f, videoUrl: "" }));
                          videoInputRef.current?.click();
                        }}
                        className="text-xs font-semibold text-zinc-400 transition hover:text-white"
                      >
                        Trocar
                      </button>
                    </div>
                  )}
                  {!videoUpload && !uploadedFile && (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="focus-duck flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-6 py-10 text-center transition hover:border-brand/50 hover:bg-brand/5"
                    >
                      <UploadCloud className="h-9 w-9 text-brand" />
                      <span className="text-sm font-bold text-white">Escolher vídeo do seu PC</span>
                      <span className="text-[11px] text-zinc-500">mp4, webm, mkv, mov... · até 4 GB</span>
                    </button>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*,.mkv,.ts,.m3u8,.m4v,.ogv,.avi"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleVideoFile(file);
                    }}
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="titulo" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Título *</label>
                  <input
                    id="titulo" required value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="descricao" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sinopse</label>
                  <textarea
                    id="descricao" rows={3} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="focus-duck w-full resize-none rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="categoria" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Categoria</label>
                  <input
                    id="categoria" list="cats" value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  />
                  <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="capa" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Capa</label>
                  <div className="flex gap-2">
                    <input
                      id="capa" value={form.thumbUrl}
                      onChange={(e) => setForm((f) => ({ ...f, thumbUrl: e.target.value }))}
                      placeholder="https://... ou envie →"
                      className="focus-duck min-w-0 flex-1 rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="button" onClick={() => thumbInputRef.current?.click()} disabled={thumbUploading}
                      className="focus-duck inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 px-3 text-xs font-bold text-zinc-300 transition hover:border-brand/50 hover:text-brand disabled:opacity-50"
                    >
                      {thumbUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      Enviar
                    </button>
                    <input
                      ref={thumbInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleThumbFile(file);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ano" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ano</label>
                  <input
                    id="ano" type="number" min={1888} max={2100} value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="duracao" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Duração (seg)</label>
                  <input
                    id="duracao" type="number" min={0} value={form.durationSec}
                    onChange={(e) => setForm((f) => ({ ...f, durationSec: e.target.value }))}
                    placeholder="600 = 10 min"
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="classificacao" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Classificação</label>
                  <select
                    id="classificacao" value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                    className="focus-duck w-full rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 text-sm text-white"
                  >
                    {RATINGS.map((r) => (
                      <option key={r} value={r}>{r === "L" ? "L — Livre" : `${r} anos`}</option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-panel-2 px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Star className={cn("h-4 w-4", form.featured && "fill-brand text-brand")} />
                    Destaque na home
                  </span>
                  <input
                    type="checkbox" checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="h-4 w-4 accent-brand"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-panel-2 px-3 py-2.5 sm:col-span-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Crown className={cn("h-4 w-4", form.vipOnly && "fill-brand text-brand")} />
                    Exclusivo para assinantes VIP
                  </span>
                  <input
                    type="checkbox" checked={form.vipOnly}
                    onChange={(e) => setForm((f) => ({ ...f, vipOnly: e.target.checked }))}
                    className="h-4 w-4 accent-brand"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button" onClick={() => setModalOpen(false)} disabled={saving}
                  className="focus-duck rounded-md px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving || !!videoUpload}
                  className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.id !== null ? "Salvar alterações" : "Adicionar ao catálogo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4 sm:p-5">
      <div className="mb-3 inline-flex rounded-lg bg-brand/10 p-2 text-brand">{icon}</div>
      <p className="font-display text-2xl tracking-wide text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
