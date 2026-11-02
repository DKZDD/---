import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.priceCents));
    return Response.json(rows);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "42P01") {
      return Response.json([
        { id: 1, name: "Grátis", slug: "free", description: "Plano básico com anúncios.", priceCents: 0, durationDays: 0, grantsVip: false, adFree: false, featured: false, sortOrder: 0, color: "#71717a", benefits: ["Catálogo padrão", "Conta gratuita", "Com anúncios"], isSystem: true, isActive: true, createdAt: new Date().toISOString() },
        { id: 2, name: "VIP Mensal", slug: "vip-mensal", description: "Acesso VIP com menos atrito.", priceCents: 2990, durationDays: 30, grantsVip: true, adFree: true, featured: true, sortOrder: 20, color: "#ffd21a", benefits: ["Catálogo VIP", "Sem anúncios", "Selo VIP"], isSystem: true, isActive: true, createdAt: new Date().toISOString() },
      ]);
    }
    throw error;
  }
}
