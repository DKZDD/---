import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ads } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placement = url.searchParams.get("placement") ?? "home";
  const audience = url.searchParams.get("audience") ?? "free";

  try {
    const rows = await db
      .select()
      .from(ads)
      .where(
        and(
          eq(ads.active, true),
          eq(ads.placement, placement),
          eq(ads.targetAudience, audience),
        ),
      )
      .orderBy(asc(ads.sortOrder), asc(ads.id));

    return Response.json(rows);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "42P01") return Response.json([]);
    throw error;
  }
}
