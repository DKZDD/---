import { Globe, MessageCircle, Rss, Share2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-[4vw] pb-12 pt-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-4 text-zinc-500">
          <a href="#" aria-label="Compartilhar" className="transition hover:text-brand">
            <Share2 className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Comunidade" className="transition hover:text-brand">
            <MessageCircle className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Novidades" className="transition hover:text-brand">
            <Rss className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Site" className="transition hover:text-brand">
            <Globe className="h-5 w-5" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-500 sm:grid-cols-4">
          <a href="#" className="transition hover:text-zinc-300">Central de Ajuda</a>
          <a href="#" className="transition hover:text-zinc-300">Formas de assistir</a>
          <a href="#" className="transition hover:text-zinc-300">Termos de uso</a>
          <a href="#" className="transition hover:text-zinc-300">Privacidade</a>
          <a href="#" className="transition hover:text-zinc-300">Direitos autorais</a>
          <a href="#" className="transition hover:text-zinc-300">Preferências</a>
          <a href="#" className="transition hover:text-zinc-300">Sobre a DuckeFlix</a>
          <a href="#" className="transition hover:text-zinc-300">Fale conosco</a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Logo className="opacity-70 [&_span]:text-lg" />
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} DuckeFlix — seu cinema em casa.
          </p>
        </div>
      </div>
    </footer>
  );
}
