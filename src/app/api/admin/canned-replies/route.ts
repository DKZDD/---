import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cannedReplies } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manageChat");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const rows = await db.select().from(cannedReplies).orderBy(asc(cannedReplies.sortOrder), asc(cannedReplies.id));
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manageChat");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) return Response.json({ error: "Título e conteúdo são obrigatórios." }, { status: 400 });
  const [created] = await db.insert(cannedReplies).values({
    title,
    content,
    sortOrder: Math.max(0, Number(body.sortOrder ?? 0)),
    active: body.active !== false,
  }).returning();
  return Response.json(created, { status: 201 });
}
