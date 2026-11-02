import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export const dynamic = "force-dynamic";

const PUBLIC_KEYS = ["pixKey", "pixLabel", "chatWelcome", "chatCta"];

export async function GET() {
  try {
    const rows = await db.select().from(siteSettings);
    const data: Record<string, string> = {};
    for (const row of rows) {
      if (PUBLIC_KEYS.includes(row.key)) data[row.key] = row.value;
    }
    return Response.json(data);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "42P01") {
      return Response.json({
        pixLabel: "PIX DuckeFlix",
        pixKey: "configure-sua-chave-pix-no-painel",
        chatWelcome: "Oi! Sou do suporte da DuckeFlix. Como posso te ajudar?",
        chatCta: "Falar com a DuckeFlix",
      });
    }
    throw error;
  }
}
