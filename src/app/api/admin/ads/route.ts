import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ads } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manageAds");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const rows = await db.select().from(ads).orderBy(asc(ads.sortOrder), asc(ads.id));
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manageAds");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (!title) return Response.json({ error: "Título obrigatório." }, { status: 400 });
  const [created] = await db.insert(ads).values({
    title,
    body: String(body.body ?? "").trim(),
    imageUrl: String(body.imageUrl ?? "").trim() || null,
    targetUrl: String(body.targetUrl ?? "").trim() || null,
    cta: String(body.cta ?? "Saiba mais").trim(),
    placement: String(body.placement ?? "home").trim(),
    targetAudience: String(body.targetAudience ?? "free").trim(),
    active: body.active !== false,
    sortOrder: Math.max(0, Number(body.sortOrder ?? 0)),
  }).returning();
  publish({ type: "ads", action: "created", id: created.id });
  return Response.json(created, { status: 201 });
}
