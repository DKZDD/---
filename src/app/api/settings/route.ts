import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export const dynamic = "force-dynamic";

const PUBLIC_KEYS = ["pixKey", "pixLabel", "chatWelcome", "chatCta"];

export async function GET() {
  const rows = await db.select().from(siteSettings);
  const data: Record<string, string> = {};
  for (const row of rows) {
    if (PUBLIC_KEYS.includes(row.key)) data[row.key] = row.value;
  }
  return Response.json(data);
}
