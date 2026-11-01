import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ads } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";
function parseId(raw: string) { const id = Number(raw); return Number.isInteger(id) && id > 0 ? id : null; }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "manageAds");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "body", "imageUrl", "targetUrl", "cta", "placement", "targetAudience"]) {
    if (body[k] !== undefined) patch[k] = String(body[k] ?? "").trim();
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.sortOrder !== undefined) patch.sortOrder = Math.max(0, Number(body.sortOrder ?? 0));
  const [updated] = await db.update(ads).set(patch).where(eq(ads.id, id)).returning();
  publish({ type: "ads", action: "updated", id });
  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "manageAds");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });
  await db.delete(ads).where(eq(ads.id, id));
  publish({ type: "ads", action: "deleted", id });
  return Response.json({ ok: true });
}
