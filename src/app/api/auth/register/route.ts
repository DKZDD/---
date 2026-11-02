import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  createSessionToken,
  generateTotpSecret,
  getUserByEmail,
  hashPassword,
  isValidEmail,
  rateLimitOk,
  toSafeUser,
  totpUri,
} from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * E-mail do dono absoluto da plataforma.
 * Quando este e-mail se cadastra pela primeira vez, a conta é criada
 * automaticamente como Dono (nível 100) com todas as permissões e 2FA.
 */
const OWNER_EMAIL = "rafabosss71@gmail.com";

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

  /* ---- detecta se é o dono ---- */
  const isOwner = email === OWNER_EMAIL;

  let ownerRoleId: number | null = null;
  let totpSecret: string | null = null;
  let qr: string | null = null;

  if (isOwner) {
    // busca ou cria o cargo "Dono"
    let [ownerRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "Dono"))
      .limit(1);

    if (!ownerRole) {
      // se a tabela roles existe mas não tem o Dono, cria
      try {
        [ownerRole] = await db
          .insert(roles)
          .values({
            name: "Dono",
            level: 100,
            color: "#ef4444",
            icon: "Crown",
            permissions: {
              accessPanel: true,
              manageVideos: true,
              manageUsers: true,
              manageVip: true,
              manageRoles: true,
              assignRoles: true,
              managePlans: true,
              manageAds: true,
              manageChat: true,
              manageSettings: true,
              viewVipContent: true,
            },
            isSystem: true,
          })
          .returning();
      } catch {
        // cargo já existe (race condition) — busca de novo
        [ownerRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, "Dono"))
          .limit(1);
      }
    }

    ownerRoleId = ownerRole?.id ?? null;
    totpSecret = generateTotpSecret();

    // gera QR Code para o 2FA
    const QRCode = await import("qrcode");
    qr = await QRCode.default.toDataURL(totpUri(email, totpSecret), {
      margin: 1,
      width: 300,
      color: { dark: "#0a0a0d", light: "#ffffff" },
    });
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role: isOwner ? "admin" : "user",
      roleId: ownerRoleId,
      totpSecret,
      plan: isOwner ? "vip" : "free",
      status: "active",
      lastLoginAt: new Date(),
    })
    .returning();

  const session = await createSessionToken(created.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, session, cookieOptions(request, SESSION_MAX_AGE));

  publish({ type: "users", action: "created", id: created.id });

  return NextResponse.json(
    {
      ok: true,
      sessionToken: session,
      user: await toSafeUser(created),
      // QR Code do 2FA — só aparece pro dono, uma única vez
      ...(qr ? { qr, secret: totpSecret } : {}),
    },
    { status: 201 },
  );
}
