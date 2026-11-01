import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="DuckeFlix — Início"
      className={cn(
        "focus-duck group inline-flex select-none items-baseline leading-none",
        className,
      )}
    >
      <span className="font-display text-2xl uppercase tracking-[0.08em] transition-transform duration-300 group-hover:scale-y-105 sm:text-3xl">
        <span className="text-zinc-100">DUCKE</span>
        <span className="text-brand drop-shadow-[0_0_18px_rgba(255,210,26,0.45)]">
          FLIX
        </span>
      </span>
    </Link>
  );
}
