import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { invalidatePlanCache, requirePermission } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function parseId(raw: string) { const id = Number(raw); return Number.isInteger(id) && id > 0 ? id : null; }
function slugify(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "managePlans");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });

  const body = await request.json();
  const benefits = Array.isArray(body.benefits)
    ? body.benefits.map((x: unknown) => String(x).trim()).filter(Boolean)
    : undefined;
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 60);
  if (typeof body.slug === "string" && body.slug.trim()) patch.slug = slugify(body.slug);
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (body.priceCents !== undefined) patch.priceCents = Math.max(0, Number(body.priceCents ?? 0));
  if (body.durationDays !== undefined) patch.durationDays = Math.max(0, Number(body.durationDays ?? 0));
  if (body.grantsVip !== undefined) patch.grantsVip = Boolean(body.grantsVip);
  if (body.adFree !== undefined) patch.adFree = Boolean(body.adFree);
  if (body.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body.sortOrder !== undefined) patch.sortOrder = Math.max(0, Number(body.sortOrder ?? 0));
  if (typeof body.color === "string") patch.color = body.color;
  if (benefits) patch.benefits = benefits;
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

  const [updated] = await db.update(subscriptionPlans).set(patch).where(eq(subscriptionPlans.id, id)).returning();
  invalidatePlanCache();
  publish({ type: "plans", action: "updated", id });
  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "managePlans");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  if (!plan) return Response.json({ error: "Plano não encontrado." }, { status: 404 });
  if (plan.isSystem) return Response.json({ error: "Planos do sistema não podem ser excluídos." }, { status: 400 });

  await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  invalidatePlanCache();
  publish({ type: "plans", action: "deleted", id });
  return Response.json({ ok: true });
}
