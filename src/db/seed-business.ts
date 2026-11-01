import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cannedReplies, siteSettings, subscriptionPlans } from "./schema";

async function ensurePlan(
  db: ReturnType<typeof drizzle>,
  plan: typeof subscriptionPlans.$inferInsert,
) {
  const [existing] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, String(plan.slug)))
    .limit(1);
  if (!existing) {
    await db.insert(subscriptionPlans).values(plan);
    console.log(`Plano criado: ${plan.name}`);
  }
}

async function ensureSetting(
  db: ReturnType<typeof drizzle>,
  key: string,
  value: string,
) {
  const [existing] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  if (!existing) {
    await db.insert(siteSettings).values({ key, value });
    console.log(`Setting criada: ${key}`);
  }
}

async function ensureReply(
  db: ReturnType<typeof drizzle>,
  title: string,
  content: string,
  sortOrder: number,
) {
  const [existing] = await db
    .select()
    .from(cannedReplies)
    .where(eq(cannedReplies.title, title))
    .limit(1);
  if (!existing) {
    await db.insert(cannedReplies).values({ title, content, sortOrder, active: true });
    console.log(`Resposta pronta criada: ${title}`);
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await ensurePlan(db, {
    name: "Grátis",
    slug: "free",
    description: "Acesso básico com anúncios.",
    priceCents: 0,
    durationDays: 0,
    grantsVip: false,
    adFree: false,
    featured: false,
    sortOrder: 0,
    color: "#71717a",
    benefits: ["Catálogo padrão", "Conta gratuita", "Com anúncios"],
    isSystem: true,
    isActive: true,
  });

  await ensurePlan(db, {
    name: "Plus Mensal",
    slug: "plus-mensal",
    description: "Sem anúncios e com benefícios extras do perfil.",
    priceCents: 1990,
    durationDays: 30,
    grantsVip: false,
    adFree: true,
    featured: false,
    sortOrder: 10,
    color: "#22c55e",
    benefits: ["Sem anúncios", "Perfil premium", "Suporte prioritário"],
    isSystem: true,
    isActive: true,
  });

  await ensurePlan(db, {
    name: "VIP Mensal",
    slug: "vip-mensal",
    description: "Acesso ao catálogo VIP por 30 dias.",
    priceCents: 2990,
    durationDays: 30,
    grantsVip: true,
    adFree: true,
    featured: true,
    sortOrder: 20,
    color: "#ffd21a",
    benefits: ["Catálogo VIP", "Sem anúncios", "Selo VIP na conta"],
    isSystem: true,
    isActive: true,
  });

  await ensurePlan(db, {
    name: "VIP Trimestral",
    slug: "vip-trimestral",
    description: "3 meses de DuckeFlix VIP.",
    priceCents: 7990,
    durationDays: 90,
    grantsVip: true,
    adFree: true,
    featured: false,
    sortOrder: 30,
    color: "#f59e0b",
    benefits: ["Catálogo VIP", "Sem anúncios", "Melhor custo-benefício"],
    isSystem: true,
    isActive: true,
  });

  await ensurePlan(db, {
    name: "VIP Anual",
    slug: "vip-anual",
    description: "12 meses completos de VIP.",
    priceCents: 24990,
    durationDays: 365,
    grantsVip: true,
    adFree: true,
    featured: false,
    sortOrder: 40,
    color: "#ef4444",
    benefits: ["Catálogo VIP", "Sem anúncios", "Assinatura anual"],
    isSystem: true,
    isActive: true,
  });

  await ensurePlan(db, {
    name: "VIP Vitalício",
    slug: "vip-vitalicio",
    description: "Liberado manualmente pelo admin, sem vencimento.",
    priceCents: 0,
    durationDays: 0,
    grantsVip: true,
    adFree: true,
    featured: false,
    sortOrder: 50,
    color: "#8b5cf6",
    benefits: ["Catálogo VIP", "Sem anúncios", "Sem vencimento"],
    isSystem: true,
    isActive: true,
  });

  await ensureSetting(db, "pixLabel", "PIX DuckeFlix");
  await ensureSetting(db, "pixKey", "configure-sua-chave-pix-no-painel");
  await ensureSetting(db, "chatWelcome", "Oi! Sou do suporte da DuckeFlix. Como posso te ajudar?");
  await ensureSetting(db, "chatCta", "Falar com a DuckeFlix");

  await ensureReply(db, "Boas-vindas", "Olá! Seja muito bem-vindo à DuckeFlix. Como posso te ajudar hoje?", 0);
  await ensureReply(db, "PIX recebido", "Perfeito! Assim que o pagamento for confirmado, eu libero o seu plano em tempo real na conta.", 10);
  await ensureReply(db, "Plano ativado", "Pronto! Seu plano já foi ativado. Se não aparecer na hora, recarregue a página ou saia e entre de novo.", 20);
  await ensureReply(db, "Anúncios", "Usuários Free veem anúncios. Em planos pagos sem anúncios, eles somem automaticamente.", 30);

  await pool.end();
  console.log("Seed business concluído!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
