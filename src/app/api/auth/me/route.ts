import { NextResponse } from "next/server";
import { getUserForApi, toSafeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUserForApi(request);
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  return NextResponse.json(await toSafeUser(user));
}
