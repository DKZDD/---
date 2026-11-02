import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cannedReplies, chatMessages, chatThreads } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";
function parseId(raw: string) { const id = Number(raw); return Number.isInteger(id) && id > 0 ? id : null; }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "manageChat");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });
  const thread = (await db.select().from(chatThreads).where(eq(chatThreads.id, id)).limit(1))[0];
  if (!thread) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.threadId, id)).orderBy(asc(chatMessages.createdAt));
  await db.update(chatThreads).set({ unreadAdmin: 0 }).where(eq(chatThreads.id, id));
  return Response.json({ thread, messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "manageChat");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });
  const thread = (await db.select().from(chatThreads).where(eq(chatThreads.id, id)).limit(1))[0];
  if (!thread) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  const body = await request.json();
  let content = String(body.content ?? "").trim();
  let presetId: number | null = null;
  if (!content && body.presetId) {
    const [preset] = await db.select().from(cannedReplies).where(eq(cannedReplies.id, Number(body.presetId))).limit(1);
    if (preset) {
      content = preset.content;
      presetId = preset.id;
    }
  }
  if (!content) return Response.json({ error: "Mensagem vazia." }, { status: 400 });

  const [message] = await db.insert(chatMessages).values({
    threadId: id,
    senderType: "admin",
    senderUserId: auth.user.id,
    content,
    presetId,
  }).returning();

  await db.update(chatThreads).set({
    lastMessageAt: new Date(),
    unreadUser: thread.unreadUser + 1,
    status: body.close === true ? "closed" : "open",
  }).where(eq(chatThreads.id, id));

  publish({ type: "chats", action: "message", id });
  return Response.json(message, { status: 201 });
}
