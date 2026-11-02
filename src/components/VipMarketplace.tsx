"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/db/schema";
import { AdSlot } from "@/components/AdSlot";
import { useUser } from "@/components/UserContext";

export function VipMarketplace() {
  const { user } = useUser();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    void Promise.all([
      fetch("/api/plans", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}),
    ]).then(([p, s]) => {
      setPlans(p as SubscriptionPlan[]);
      setSettings(s as Record<string, string>);
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex rounded-3xl border border-brand/25 bg-brand/10 p-5">
          <Crown className="h-12 w-12 text-brand" />
        </span>
        <h1 className="font-display mt-6 text-4xl uppercase tracking-wide sm:text-6xl">
          Assine o <span className="text-brand">DuckeFlix</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Escolha o plano ideal para você. Planos pagos podem remover anúncios,
          liberar o catálogo VIP e destacar sua conta.
        </p>
      </div>

      {!user?.showAds ? null : <AdSlot placement="vip" className="mx-auto mt-10 max-w-3xl" />}

      <div className="mt-12 grid gap-5 lg:grid-cols-4">
        {plans.map((plan) => {
          const current = user?.subscriptionPlanId === plan.id && user.isPaid;
          return (
            <div key={plan.id} className={`relative rounded-3xl border p-6 ${plan.featured ? 'border-brand/50 bg-brand/5' : 'border-white/10 bg-panel'}`}>
              {plan.featured && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-1 text-[10px] font-extrabold text-black">
                  <Sparkles className="h-3 w-3" />Recomendado
                </span>
              )}
              <div className="mb-4 inline-flex rounded-md px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: plan.color + '22', color: plan.color }}>{plan.name}</div>
              <h2 className="text-3xl font-black text-white">R$ {(plan.priceCents / 100).toFixed(2)}</h2>
              <p className="mt-1 text-xs text-zinc-500">{plan.durationDays > 0 ? `${plan.durationDays} dias` : 'vitalício / manual'}</p>
              <p className="mt-4 text-sm text-zinc-400">{plan.description || 'Acesso premium ao DuckeFlix.'}</p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{b}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
                {plan.grantsVip && <span className="rounded-full bg-brand/15 px-2 py-1 font-bold text-brand">Catálogo VIP</span>}
                {plan.adFree && <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300">Sem anúncios</span>}
              </div>
              <div className="mt-6">
                {current ? (
                  <span className="inline-flex rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-zinc-200">Seu plano atual</span>
                ) : (
                  <Link href="#pix" className="focus-duck inline-flex rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-brand-300">Quero este plano</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section id="pix" className="mt-14 rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white">Pagamento via PIX</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Após o pagamento, o administrador libera o plano escolhido no seu
          cadastro. A ativação aparece em tempo real na sua conta.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-panel-2 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Identificação</p>
            <p className="mt-2 font-bold text-white">{settings.pixLabel || 'PIX DuckeFlix'}</p>
          </div>
          <div className="rounded-2xl border border-brand/25 bg-brand/5 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Chave PIX</p>
            <p className="mt-2 break-all font-mono text-sm text-brand">{settings.pixKey || 'Configure sua chave PIX no painel admin.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
