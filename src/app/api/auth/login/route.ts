import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  PRE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  createPreToken,
  createSessionToken,
  getUserByEmail,
  rateLimitOk,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Preencha o e-mail e a senha." },
      { status: 400 },
    );
  }

  if (!rateLimitOk(`login:${email}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 10 minutos e tente novamente." },
      { status: 429 },
    );
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  if (user.status === "suspended") {
    return NextResponse.json(
      {
        error:
          "Esta conta está suspensa. Entre em contato com o suporte do DuckeFlix.",
      },
      { status: 403 },
    );
  }

  const store = await cookies();

  // contas admin exigem o segundo fator
  if (user.role === "admin" && user.totpSecret) {
    const pre = await createPreToken(user.id);
    store.set(PRE_COOKIE, pre, cookieOptions(request, 60 * 5));
    return NextResponse.json({ requires2fa: true, preToken: pre });
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const session = await createSessionToken(user.id);
  store.set(SESSION_COOKIE, session, cookieOptions(request, SESSION_MAX_AGE));

  return NextResponse.json({
    ok: true,
    sessionToken: session,
    user: await toSafeUser(user),
  });
}
