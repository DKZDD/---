import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { getSessionUser, isVipActive } from "@/lib/auth";
import { getRelated, getVideoById } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoById(Number(id));
  return { title: video ? `Assistir: ${video.title}` : "Assistir" };
}

export default async function AssistirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();

  const video = await getVideoById(id);
  if (!video) notFound();

  // conteúdo VIP: bloqueia no servidor (o vídeo nunca chega ao navegador)
  if (video.vipOnly) {
    const viewer = await getSessionUser();
    const allowed = viewer && (await isVipActive(viewer));
    if (!allowed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="rounded-3xl border border-brand/25 bg-brand/10 p-5">
            <Lock className="h-10 w-10 text-brand" />
          </span>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-5xl">
            Conteúdo exclusivo VIP
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            <span className="font-semibold text-white">{video.title}</span> está
            disponível apenas para assinantes DuckeFlix VIP.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/vip"
              className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-extrabold text-black transition hover:bg-brand-300"
            >
              <Crown className="h-4 w-4" />
              Conhecer o VIP
            </Link>
            <Link
              href="/"
              className="focus-duck rounded-md border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400"
            >
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      );
    }
  }

  // contabiliza a visualização
  await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, id));

  const related = await getRelated(video.category, video.id, 12);

  return (
    <div className="min-h-screen bg-black">
      <VideoPlayer video={video} />

      {related.length > 0 && (
        <section className="border-t border-white/10 bg-ink px-[4vw] py-12">
          <h2 className="mb-6 text-xl font-bold text-zinc-100 sm:text-2xl">
            Mais títulos para você
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {related.map((v) => (
              <VideoCard key={v.id} video={v} className="w-full lg:max-w-none" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
