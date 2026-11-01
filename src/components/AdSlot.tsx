"use client";

import { useEffect, useState } from "react";
import type { Ad } from "@/db/schema";
import { useUser } from "@/components/UserContext";

export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const { user, loading } = useUser();
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    if (loading) return;
    const audience = user?.showAds === false ? "paid" : "free";
    if (user && !user.showAds) return;
    let mounted = true;
    void (async () => {
      const r = await fetch(`/api/ads?placement=${encodeURIComponent(placement)}&audience=${audience}`, { cache: "no-store" });
      if (!r.ok) return;
      const rows = (await r.json()) as Ad[];
      if (!mounted || rows.length === 0) return;
      const picked = rows[0];
      setAd(picked);
      void fetch(`/api/ads/${picked.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "impression" }),
      });
    })();
    return () => { mounted = false; };
  }, [placement, user, loading]);

  if (loading || !ad || (user && !user.showAds)) return null;

  return (
    <a
      href={ad.targetUrl || '#'}
      target={ad.targetUrl ? '_blank' : undefined}
      rel={ad.targetUrl ? 'noreferrer' : undefined}
      onClick={() => {
        void fetch(`/api/ads/${ad.id}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "click" }),
        });
      }}
      className={`group block overflow-hidden rounded-2xl border border-white/10 bg-panel transition hover:border-brand/40 ${className}`}
    >
      {ad.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.imageUrl} alt={ad.title} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" />
      )}
      <div className="space-y-2 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand">Anúncio</p>
        <h3 className="font-bold text-white">{ad.title}</h3>
        {ad.body && <p className="text-sm text-zinc-400">{ad.body}</p>}
        <span className="inline-flex rounded-md bg-brand px-3 py-1.5 text-xs font-extrabold text-black">{ad.cta}</span>
      </div>
    </a>
  );
}
