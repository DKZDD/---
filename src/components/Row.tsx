"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Video } from "@/db/schema";
import { VideoCard } from "@/components/VideoCard";
import { cn } from "@/lib/utils";

export function Row({
  id,
  title,
  videos,
  numbered = false,
}: {
  id?: string;
  title: string;
  videos: Video[];
  numbered?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) return null;

  function scrollBy(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <section id={id} className="group/row relative scroll-mt-24">
      <h2 className="mb-1 px-[4vw] text-base font-bold tracking-wide text-zinc-200 sm:text-xl">
        {title}
      </h2>

      <div className="relative">
        <button
          type="button"
          aria-label="Rolar para a esquerda"
          onClick={() => scrollBy(-1)}
          className="focus-duck absolute inset-y-0 left-0 z-40 hidden w-[4vw] items-center justify-center bg-gradient-to-r from-black/70 to-transparent text-white opacity-0 transition-opacity duration-300 hover:text-brand group-hover/row:opacity-100 sm:flex"
        >
          <ChevronLeft className="h-9 w-9" />
        </button>

        <div
          ref={trackRef}
          className={cn(
            "no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-[4vw] py-7 sm:gap-3",
            numbered && "items-end",
          )}
        >
          {videos.map((v, i) =>
            numbered ? (
              <div key={v.id} className="relative flex shrink-0 items-end">
                <span
                  aria-hidden
                  className="font-display -mb-4 -mr-3 select-none text-[6.5rem] leading-[0.8] text-transparent sm:text-[8.5rem]"
                  style={{ WebkitTextStroke: "3px #3f3f46" }}
                >
                  {i + 1}
                </span>
                <VideoCard
                  video={v}
                  className="w-[32vw] sm:w-[21vw] md:w-[16vw] lg:w-[13vw] lg:max-w-[240px]"
                />
              </div>
            ) : (
              <VideoCard key={v.id} video={v} />
            ),
          )}
        </div>

        <button
          type="button"
          aria-label="Rolar para a direita"
          onClick={() => scrollBy(1)}
          className="focus-duck absolute inset-y-0 right-0 z-40 hidden w-[4vw] items-center justify-center bg-gradient-to-l from-black/70 to-transparent text-white opacity-0 transition-opacity duration-300 hover:text-brand group-hover/row:opacity-100 sm:flex"
        >
          <ChevronRight className="h-9 w-9" />
        </button>
      </div>
    </section>
  );
}
