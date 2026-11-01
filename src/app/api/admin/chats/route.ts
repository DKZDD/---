import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatThreads, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manageChat");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const threads = await db.select().from(chatThreads).orderBy(desc(chatThreads.lastMessageAt));
  const userRows = await db.select().from(users);
  const byId = new Map(userRows.map((u) => [u.id, u]));

  return Response.json(
    threads.map((t) => ({
      ...t,
      user: byId.get(t.userId)
        ? { id: byId.get(t.userId)!.id, name: byId.get(t.userId)!.name, email: byId.get(t.userId)!.email }
        : null,
    })),
  );
}
