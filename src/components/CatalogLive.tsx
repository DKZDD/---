"use client";

import { useCallback, useEffect, useState } from "react";
import { Popcorn } from "lucide-react";
import type { Video } from "@/db/schema";
import { AdSlot } from "@/components/AdSlot";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { useLive } from "@/lib/useLive";

/**
 * Catálogo reativo: recebe os dados renderizados no servidor e se
 * reconecta ao stream SSE para refletir qualquer mudança feita no painel
 * em tempo real, sem recarregar a página.
 */
export function CatalogLive({ initialVideos }: { initialVideos: Video[] }) {
  const [videos, setVideos] = useState(initialVideos);

  useEffect(() => setVideos(initialVideos), [initialVideos]);

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/videos", { cache: "no-store" });
      if (r.ok) setVideos(await r.json());
    } catch {
      /* mantém o catálogo atual */
    }
  }, []);

  useLive(
    useCallback(() => {
      void reload();
    }, [reload]),
    "videos",
  );

  if (videos.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="rounded-3xl border border-brand/25 bg-brand/10 p-6">
          <Popcorn className="h-14 w-14 text-brand" />
        </span>
        <h1 className="font-display max-w-xl text-4xl uppercase tracking-wide sm:text-6xl">
          Catálogo em preparação
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
          Novos títulos chegam em breve ao DuckeFlix. Volte logo!
        </p>
      </main>
    );
  }

  const featured = videos.find((v) => v.featured) ?? videos[0];
  const top = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);
  const vip = videos.filter((v) => v.vipOnly);
  const categories = [...new Set(videos.map((v) => v.category))];

  return (
    <>
      <Hero video={featured} />
      <main id="catalogo" className="relative z-10 -mt-16 space-y-4 pb-16 sm:-mt-24">
        <div className="px-[4vw]"><AdSlot placement="home" /></div>
        <Row id="em-alta" title="Top 10 no DuckeFlix hoje" videos={top} numbered />
        {vip.length > 0 && (
          <Row id="vip" title="👑 Exclusivos VIP" videos={vip} />
        )}
        {categories.map((c) => (
          <Row key={c} title={c} videos={videos.filter((v) => v.category === c)} />
        ))}
        <Row title="Adicionados recentemente" videos={videos.slice(0, 15)} />
      </main>
    </>
  );
}
