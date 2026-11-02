import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, chatThreads } from "@/db/schema";
import { getUserForApi } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUserForApi(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, user.id))
    .orderBy(desc(chatThreads.lastMessageAt))
    .limit(1);

  if (!thread) return Response.json({ thread: null, messages: [] });

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, thread.id))
    .orderBy(asc(chatMessages.createdAt));

  // usuário abriu a conversa → zera contador dele
  await db.update(chatThreads).set({ unreadUser: 0 }).where(eq(chatThreads.id, thread.id));

  return Response.json({ thread, messages });
}

export async function POST(request: Request) {
  const user = await getUserForApi(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json();
  const content = String(body.content ?? "").trim();
  if (!content) return Response.json({ error: "Mensagem vazia." }, { status: 400 });

  let [thread] = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, user.id))
    .orderBy(desc(chatThreads.lastMessageAt))
    .limit(1);

  if (!thread) {
    [thread] = await db.insert(chatThreads).values({
      userId: user.id,
      subject: String(body.subject ?? "Atendimento DuckeFlix").trim() || "Atendimento DuckeFlix",
      status: "open",
      unreadAdmin: 0,
      unreadUser: 0,
    }).returning();
    publish({ type: "chats", action: "created", id: thread.id });
  }

  const [message] = await db.insert(chatMessages).values({
    threadId: thread.id,
    senderType: "user",
    senderUserId: user.id,
    content,
  }).returning();

  await db.update(chatThreads).set({
    lastMessageAt: new Date(),
    unreadAdmin: thread.unreadAdmin + 1,
    status: thread.status === "closed" ? "open" : thread.status,
  }).where(eq(chatThreads.id, thread.id));

  publish({ type: "chats", action: "message", id: thread.id });
  return Response.json({ threadId: thread.id, message }, { status: 201 });
}
