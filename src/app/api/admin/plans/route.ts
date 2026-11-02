import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { requirePermission, invalidatePlanCache } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "managePlans");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const rows = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder));
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "managePlans");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const body = await request.json();
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return Response.json({ error: "Nome obrigatório." }, { status: 400 });

  const benefits = Array.isArray(body.benefits)
    ? body.benefits.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  try {
    const [created] = await db.insert(subscriptionPlans).values({
      name,
      slug: slugify(String(body.slug ?? name)),
      description: String(body.description ?? "").trim(),
      priceCents: Math.max(0, Number(body.priceCents ?? 0)),
      durationDays: Math.max(0, Number(body.durationDays ?? 0)),
      grantsVip: Boolean(body.grantsVip),
      adFree: Boolean(body.adFree),
      featured: Boolean(body.featured),
      sortOrder: Math.max(0, Number(body.sortOrder ?? 0)),
      color: String(body.color ?? "#71717a"),
      benefits,
      isSystem: false,
      isActive: body.isActive !== false,
    }).returning();
    invalidatePlanCache();
    publish({ type: "plans", action: "created", id: created.id });
    return Response.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json({ error: "Nome ou slug já existem." }, { status: 409 });
    }
    throw err;
  }
}
