"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Crown, Lock, Play } from "lucide-react";
import type { Video } from "@/db/schema";
import { VideoModal } from "@/components/VideoModal";
import { useUser } from "@/components/UserContext";
import { cn } from "@/lib/utils";

export function VideoCard({
  video,
  className,
}: {
  video: Video;
  className?: string;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { user } = useUser();
  const locked = video.vipOnly && !user?.isVip;

  return (
    <>
      <div
        className={cn(
          "group relative aspect-video w-[46vw] shrink-0 select-none transition-all duration-300 ease-out hover:z-30 hover:scale-[1.08] sm:w-[30vw] md:w-[23vw] lg:w-[18vw] lg:max-w-[320px]",
          className,
        )}
      >
        <div className="relative h-full w-full overflow-hidden rounded-md bg-panel-2 ring-1 ring-white/5 transition-shadow duration-300 group-hover:shadow-[0_18px_50px_rgba(0,0,0,0.7)] group-hover:ring-brand/40">
          {video.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbUrl}
              alt={video.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-2 via-panel to-ink p-3 text-center">
              <span className="font-display text-sm uppercase tracking-wider text-zinc-400">
                {video.title}
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="mb-2 line-clamp-1 text-sm font-bold text-white">
              {video.title}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={locked ? "/vip" : `/assistir/${video.id}`}
                aria-label={locked ? "Conteúdo VIP" : `Assistir ${video.title}`}
                className="focus-duck pointer-events-auto rounded-full bg-brand p-2 text-black transition hover:scale-110 hover:bg-brand-300"
              >
                {locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-black" />
                )}
              </Link>
              <button
                type="button"
                aria-label="Mais informações"
                onClick={() => setInfoOpen(true)}
                className="focus-duck pointer-events-auto ml-auto rounded-full border border-zinc-500 bg-black/60 p-2 text-zinc-200 transition hover:scale-110 hover:border-white hover:text-white"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {video.vipOnly && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
              <Crown className="h-3 w-3" />
              VIP
            </span>
          )}

          {locked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-0">
              <Lock className="h-7 w-7 text-brand drop-shadow-lg" />
            </div>
          )}

          {video.featured && !video.vipOnly && (
            <span className="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
              Destaque
            </span>
          )}
        </div>
      </div>

      <VideoModal
        video={video}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </>
  );
}
