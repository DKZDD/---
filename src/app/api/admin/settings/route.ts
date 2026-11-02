import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manageSettings");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const rows = await db.select().from(siteSettings);
  return Response.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

export async function PATCH(request: Request) {
  const auth = await requirePermission(request, "manageSettings");
  if (!auth) return Response.json({ error: "Sem permissão." }, { status: 403 });
  const body = await request.json();
  const allowed = ["pixKey", "pixLabel", "chatWelcome", "chatCta"];

  for (const key of allowed) {
    if (!(key in body)) continue;
    const value = String(body[key] ?? "");
    const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    if (existing) {
      await db.update(siteSettings).set({ value, updatedAt: new Date() }).where(eq(siteSettings.id, existing.id));
    } else {
      await db.insert(siteSettings).values({ key, value });
    }
  }

  publish({ type: "settings", action: "updated" });
  return Response.json({ ok: true });
}
