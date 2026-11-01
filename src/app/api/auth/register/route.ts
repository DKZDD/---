import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  createSessionToken,
  getUserByEmail,
  hashPassword,
  isValidEmail,
  rateLimitOk,
  toSafeUser,
} from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Cadastro público de espectadores.
 * Nunca cria contas admin nem VIP — esses papéis só são concedidos por um
 * administrador dentro do painel.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 8 caracteres." },
      { status: 400 },
    );
  }
  if (!rateLimitOk(`register:${email}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 },
    );
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role: "user", // forçado: cadastro público jamais cria admin
      plan: "free",
      status: "active",
      lastLoginAt: new Date(),
    })
    .returning();

  const session = await createSessionToken(created.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, session, cookieOptions(request, SESSION_MAX_AGE));

  publish({ type: "users", action: "created", id: created.id });

  return NextResponse.json(
    { ok: true, sessionToken: session, user: await toSafeUser(created) },
    { status: 201 },
  );
}
