import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  PRE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkTotp,
  cookieOptions,
  createSessionToken,
  getUserById,
  rateLimitOk,
  readPreToken,
  toSafeUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* tenta apenas o cookie */
  }

  const store = await cookies();
  const bodyToken =
    typeof body.preToken === "string" ? body.preToken : undefined;
  const userId = await readPreToken(store.get(PRE_COOKIE)?.value ?? bodyToken);
  if (!userId) {
    return NextResponse.json(
      { error: "Sessão de login expirada. Faça login novamente." },
      { status: 401 },
    );
  }

  if (!rateLimitOk(`2fa:${userId}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 10 minutos e faça login de novo." },
      { status: 429 },
    );
  }

  const user = await getUserById(userId);
  if (!user || !user.totpSecret) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }
  if (user.status === "suspended") {
    return NextResponse.json({ error: "Conta suspensa." }, { status: 403 });
  }

  const code = String(body.code ?? "");
  const epochMs = typeof body.epoch === "number" ? body.epoch : undefined;

  if (!checkTotp(code, user.totpSecret, epochMs)) {
    return NextResponse.json(
      {
        error:
          "Código incorreto. Confira se o horário do celular está automático e gere um novo código.",
      },
      { status: 401 },
    );
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const session = await createSessionToken(user.id);
  store.set(SESSION_COOKIE, session, cookieOptions(request, SESSION_MAX_AGE));
  store.delete(PRE_COOKIE);

  return NextResponse.json({
    ok: true,
    sessionToken: session,
    user: await toSafeUser(user),
  });
}
