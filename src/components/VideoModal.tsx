"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Eye,
  Link2,
  HardDrive,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Video } from "@/db/schema";
import { formatDuration, formatViews, isDirectVideo } from "@/lib/utils";

const RATING_COLORS: Record<string, string> = {
  L: "bg-emerald-500",
  "10": "bg-sky-500",
  "12": "bg-yellow-500 text-black",
  "14": "bg-orange-500",
  "16": "bg-red-500",
  "18": "bg-zinc-900 border border-zinc-600",
};

export function RatingBadge({ rating }: { rating: string }) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold text-white ${
        RATING_COLORS[rating] ?? "bg-zinc-700"
      }`}
    >
      {rating}
    </span>
  );
}

export function VideoModal({
  video,
  open,
  onClose,
}: {
  video: Video;
  open: boolean;
  onClose: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const playable = isDirectVideo(video.videoUrl);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setMuted(true);
  }, [open]);

  if (!open) return null;

  const addedDate = new Date(video.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        aria-label="Fechar detalhes"
        onClick={onClose}
        className="animate-fade-in fixed inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />

      <div className="animate-modal relative z-10 my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-panel shadow-[0_30px_120px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {/* Preview */}
        <div className="relative aspect-video w-full bg-black">
          {playable ? (
            <video
              key={video.id}
              src={video.videoUrl}
              poster={video.thumbUrl ?? undefined}
              autoPlay
              loop
              muted={muted}
              playsInline
              className="h-full w-full object-cover"
            />
          ) : video.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbUrl}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-2 to-ink">
              <Play className="h-16 w-16 text-zinc-700" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="focus-duck absolute right-4 top-4 z-20 rounded-full bg-black/70 p-2 text-zinc-200 transition hover:bg-black hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">
                DuckeFlix apresenta
              </p>
              <h3 className="font-display text-3xl uppercase tracking-wide text-white text-cinema sm:text-5xl">
                {video.title}
              </h3>
            </div>
            {playable && (
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Ativar som" : "Silenciar"}
                className="focus-duck shrink-0 rounded-full border border-zinc-500/70 bg-black/50 p-2.5 text-zinc-200 backdrop-blur transition hover:border-white hover:text-white"
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-bold text-emerald-400">
              {Math.min(99, 68 + (video.views % 31))}% relevante
            </span>
            {video.year && <span className="text-zinc-300">{video.year}</span>}
            {video.durationSec ? (
              <span className="text-zinc-300">
                {formatDuration(video.durationSec)}
              </span>
            ) : null}
            <RatingBadge rating={video.rating} />
            <span className="rounded border border-zinc-600 px-1.5 text-[10px] font-semibold uppercase text-zinc-400">
              HD
            </span>
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Eye className="h-3.5 w-3.5" />
              {formatViews(video.views)} visualizações
            </span>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            {video.description || "Sem sinopse cadastrada ainda."}
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/assistir/${video.id}`}
              className="focus-duck group inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-bold text-black transition hover:bg-brand-300"
            >
              <Play className="h-4 w-4 fill-black transition-transform group-hover:scale-110" />
              Assistir agora
            </Link>
            <Link
              href={`/busca?q=${encodeURIComponent(video.category)}`}
              className="focus-duck inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400 hover:text-white"
            >
              Mais de {video.category}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs text-zinc-500 sm:grid-cols-3">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Adicionado em {addedDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {video.source === "upload" ? (
                <>
                  <HardDrive className="h-3.5 w-3.5" />
                  Enviado do seu PC
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  Fonte externa (link)
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Gênero: <span className="text-zinc-300">{video.category}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
