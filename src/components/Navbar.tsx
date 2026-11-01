"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Crown, LogOut, Search, Shield, User as UserIcon, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useUser } from "@/components/UserContext";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/#em-alta", label: "Em alta" },
  { href: "/#catalogo", label: "Catálogo" },
  { href: "/vip", label: "VIP" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, loading, logout } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/busca?q=${encodeURIComponent(term)}` : "/busca");
    setSearchOpen(false);
    setQ("");
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-ink/95 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent",
      )}
    >
      <div className="flex h-16 items-center gap-6 px-[4vw] sm:h-[72px] sm:gap-10">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="focus-duck text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {searchOpen ? (
            <form
              onSubmit={submitSearch}
              className="animate-fade-in flex items-center gap-2 rounded-md border border-zinc-600 bg-black/80 px-3 py-1.5"
            >
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Títulos, gêneros..."
                className="w-36 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500 sm:w-56"
              />
              <button
                type="button"
                aria-label="Fechar busca"
                onClick={() => setSearchOpen(false)}
                className="text-zinc-400 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              aria-label="Abrir busca"
              onClick={() => setSearchOpen(true)}
              className="focus-duck rounded-md p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Minha conta"
                className={cn(
                  "focus-duck flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold uppercase transition",
                  user.isVip
                    ? "bg-brand text-black ring-2 ring-brand/40"
                    : "bg-panel-2 text-zinc-200 hover:bg-white/15",
                )}
              >
                {(user.name || user.email).slice(0, 2)}
              </button>

              {menuOpen && (
                <>
                  <button
                    aria-label="Fechar menu"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="animate-fade-in absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl">
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="truncate text-sm font-bold text-white">
                        {user.name || "Minha conta"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {user.isVip ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                            <Crown className="h-3 w-3" />VIP
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                            Plano grátis
                          </span>
                        )}
                        {user.role === "admin" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                            <Shield className="h-3 w-3" />Admin
                          </span>
                        )}
                      </div>
                    </div>

                    {!user.isVip && (
                      <Link
                        href="/vip"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-white/5"
                      >
                        <Crown className="h-4 w-4" />
                        Seja VIP
                      </Link>
                    )}

                    <button
                      onClick={() => void logout()}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-red-300"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/entrar"
                className="focus-duck inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:text-white"
              >
                <UserIcon className="h-4 w-4" />
                Entrar
              </Link>
              <Link
                href="/criar-conta"
                className="focus-duck hidden rounded-md bg-brand px-3.5 py-1.5 text-sm font-extrabold text-black transition hover:bg-brand-300 sm:inline-flex"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
