"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info, Play, Volume2, VolumeX } from "lucide-react";
import type { Video } from "@/db/schema";
import { RatingBadge, VideoModal } from "@/components/VideoModal";
import { cn, formatDuration, isDirectVideo } from "@/lib/utils";

export function Hero({ video }: { video: Video }) {
  const playable = isDirectVideo(video.videoUrl);
  const [showPreview, setShowPreview] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!playable) return;
    const t = setTimeout(() => setShowPreview(true), 1600);
    return () => clearTimeout(t);
  }, [playable]);

  return (
    <section className="relative flex min-h-[86vh] items-end overflow-hidden sm:min-h-[92vh]">
      {/* Fundo: imagem com ken burns + preview em vídeo */}
      <div className="absolute inset-0">
        {video.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbUrl}
            alt={video.title}
            className={cn(
              "animate-kenburns h-full w-full object-cover transition-opacity duration-1000",
              videoReady && "opacity-0",
            )}
          />
        )}
        {showPreview && (
          <video
            src={video.videoUrl}
            autoPlay
            loop
            muted={muted}
            playsInline
            onCanPlay={() => setVideoReady(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
              videoReady ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/40" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 w-full px-[4vw] pb-24 pt-40 sm:pb-32">
        <div className="max-w-2xl space-y-5">
          <div className="animate-rise inline-flex items-center gap-2">
            <span className="rounded-sm bg-brand px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-black">
              DuckeFlix
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-300">
              Destaque da semana
            </span>
          </div>

          <h1 className="animate-rise font-display text-5xl uppercase leading-[0.95] tracking-wide text-white text-cinema sm:text-7xl lg:text-8xl">
            {video.title}
          </h1>

          <div className="animate-rise flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-bold text-emerald-400">
              {Math.min(99, 68 + (video.views % 31))}% relevante
            </span>
            {video.year && <span className="text-zinc-200">{video.year}</span>}
            {video.durationSec ? (
              <span className="text-zinc-200">
                {formatDuration(video.durationSec)}
              </span>
            ) : null}
            <RatingBadge rating={video.rating} />
            <span className="rounded border border-zinc-500 px-1.5 text-[10px] font-semibold uppercase text-zinc-300">
              {video.category}
            </span>
          </div>

          <p className="animate-rise-late line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-200 text-cinema sm:text-base">
            {video.description}
          </p>

          <div className="animate-rise-late flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/assistir/${video.id}`}
              className="focus-duck animate-duck-pulse group inline-flex items-center gap-2.5 rounded-md bg-brand px-7 py-3 text-base font-extrabold text-black transition hover:bg-brand-300"
            >
              <Play className="h-5 w-5 fill-black transition-transform duration-300 group-hover:scale-125" />
              Assistir
            </Link>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="focus-duck inline-flex items-center gap-2.5 rounded-md bg-zinc-500/30 px-7 py-3 text-base font-bold text-white backdrop-blur-md transition hover:bg-zinc-500/45"
            >
              <Info className="h-5 w-5" />
              Mais informações
            </button>
          </div>
        </div>
      </div>

      {/* Controle de som do preview */}
      {videoReady && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="focus-duck animate-fade-in absolute bottom-28 right-[4vw] z-10 rounded-full border border-zinc-400/70 bg-black/40 p-3 text-zinc-200 backdrop-blur transition hover:border-white hover:text-white sm:bottom-32"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      <VideoModal
        video={video}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </section>
  );
}
