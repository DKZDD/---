import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  generateTotpSecret,
  getPlanById,
  getRoleById,
  getUserByEmail,
  getUserLevel,
  hashPassword,
  isValidEmail,
  requirePermission,
  toSafeUser,
  totpUri,
} from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "accessPanel");
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return NextResponse.json(await Promise.all(rows.map(toSafeUser)));
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manageUsers");
  if (!auth) return NextResponse.json({ error: "Sem permissão para criar contas." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const roleId = body.roleId ? Number(body.roleId) : null;
  const subscriptionPlanId = body.subscriptionPlanId ? Number(body.subscriptionPlanId) : null;

  if (!name) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  if (await getUserByEmail(email)) return NextResponse.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });

  const callerLevel = await getUserLevel(auth.user);
  let role = roleId ? await getRoleById(roleId) : null;
  if (role) {
    if (!auth.perms.assignRoles) return NextResponse.json({ error: "Seu cargo não pode atribuir cargos." }, { status: 403 });
    if (role.level >= callerLevel) return NextResponse.json({ error: "Não pode atribuir cargo igual ou acima do seu nível." }, { status: 403 });
  }

  let plan = subscriptionPlanId ? await getPlanById(subscriptionPlanId) : null;
  if (plan && !auth.perms.managePlans) {
    return NextResponse.json({ error: "Seu cargo não pode aplicar planos." }, { status: 403 });
  }

  const totpSecret = role?.permissions.accessPanel ? generateTotpSecret() : null;
  const subscriptionEndsAt = plan && plan.durationDays > 0 ? new Date(Date.now() + plan.durationDays * 86_400_000) : null;
  const legacyPlan = plan?.grantsVip ? "vip" : "free";

  const [created] = await db.insert(users).values({
    name,
    email,
    passwordHash: hashPassword(password),
    totpSecret,
    roleId: role?.id ?? null,
    role: role?.permissions.accessPanel ? "admin" : "user",
    plan: legacyPlan,
    subscriptionPlanId: plan?.id ?? null,
    subscriptionEndsAt,
    status: "active",
    vipUntil: plan?.grantsVip ? subscriptionEndsAt : null,
  }).returning();

  publish({ type: "users", action: "created", id: created.id });

  let qr: string | null = null;
  if (totpSecret) {
    qr = await QRCode.toDataURL(totpUri(email, totpSecret), {
      margin: 1,
      width: 300,
      color: { dark: "#0a0a0d", light: "#ffffff" },
    });
  }

  return NextResponse.json({ user: await toSafeUser(created), qr, secret: totpSecret }, { status: 201 });
}
