import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ads } from "@/db/schema";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return Response.json({ error: "ID inválido." }, { status: 400 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  const kind = body.kind === "click" ? "click" : "impression";

  await db
    .update(ads)
    .set(
      kind === "click"
        ? { clicks: sql`${ads.clicks} + 1` }
        : { impressions: sql`${ads.impressions} + 1` },
    )
    .where(eq(ads.id, id));

  publish({ type: "ads", action: kind, id });
  return Response.json({ ok: true });
}
