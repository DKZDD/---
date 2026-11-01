import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { getAllVideos, searchVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buscar" };

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const results = term ? await searchVideos(term) : await getAllVideos();

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-[4vw] pb-20 pt-28">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {term ? (
            <>
              Resultados para{" "}
              <span className="text-brand">&ldquo;{term}&rdquo;</span>
            </>
          ) : (
            "Explorar todo o catálogo"
          )}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {results.length}{" "}
          {results.length === 1 ? "título encontrado" : "títulos encontrados"}
        </p>

        <div className="mt-6"><AdSlot placement="search" /></div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <SearchX className="h-12 w-12 text-zinc-600" />
            <p className="text-lg font-semibold text-zinc-300">
              Nenhum resultado para &ldquo;{term}&rdquo;
            </p>
            <p className="max-w-sm text-sm text-zinc-500">
              Tente buscar por outro título, gênero ou palavra-chave, ou volte
              em breve — novos conteúdos chegam toda semana.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((v) => (
              <VideoCard key={v.id} video={v} className="w-full lg:max-w-none" />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
