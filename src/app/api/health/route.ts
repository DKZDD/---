import { sql } from "drizzle-orm";
import { requireDb } from "@/db";

export async function GET() {
  try {
    // query simples via Drizzle, que usa o Pool internamente
    await requireDb().execute(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "DATABASE_URL missing or unreachable" },
      { status: 503 },
    );
  }
}

