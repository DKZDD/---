import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import {
  generateTotpSecret,
  getPlanById,
  getUserById,
  getUserLevel,
  getRoleById,
  hashPassword,
  requirePermission,
  toSafeUser,
  totpUri,
} from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, "accessPanel");
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const callerLevel = await getUserLevel(auth.user);
  const targetLevel = await getUserLevel(target);

  // hierarquia: não pode mexer em alguém do mesmo nível ou acima
  if (id !== auth.user.id && targetLevel >= callerLevel) {
    return NextResponse.json(
      { error: "Você não pode alterar contas com cargo de nível igual ou acima do seu." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const patch: Partial<User> = {};
  let newQr: string | null = null;
  let newSecret: string | null = null;

  /* ---- assinatura / VIP ---- */
  if ("subscriptionPlanId" in body) {
    if (!auth.perms.managePlans && !auth.perms.manageVip) {
      return NextResponse.json({ error: "Sem permissão para alterar assinaturas." }, { status: 403 });
    }
    const newPlanId = body.subscriptionPlanId ? Number(body.subscriptionPlanId) : null;
    const plan = newPlanId ? await getPlanById(newPlanId) : null;
    patch.subscriptionPlanId = plan?.id ?? null;
    patch.subscriptionEndsAt = plan && plan.durationDays > 0 ? new Date(Date.now() + plan.durationDays * 86_400_000) : null;
    patch.plan = plan?.grantsVip ? "vip" : "free";
    patch.vipUntil = plan?.grantsVip ? patch.subscriptionEndsAt ?? null : null;
  } else if ("plan" in body && auth.perms.manageVip) {
    const plan = body.plan === "vip" ? "vip" : "free";
    patch.plan = plan;
    if (plan === "vip") {
      const days = Number(body.vipDays ?? 0);
      patch.vipUntil = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
    } else {
      patch.vipUntil = null;
    }
  }

  /* ---- status ---- */
  if ("status" in body && auth.perms.manageUsers) {
    const status = body.status === "suspended" ? "suspended" : "active";
    if (target.id === auth.user.id && status === "suspended") {
      return NextResponse.json({ error: "Você não pode suspender a própria conta." }, { status: 400 });
    }
    patch.status = status;
  }

  /* ---- trocar cargo ---- */
  if ("roleId" in body && auth.perms.assignRoles) {
    const newRoleId = Number(body.roleId);
    const newRole = await getRoleById(newRoleId);
    if (!newRole) {
      return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });
    }
    // hierarquia: não pode atribuir cargo >= ao seu
    if (newRole.level >= callerLevel) {
      return NextResponse.json(
        { error: `Não pode atribuir cargo de nível ${newRole.level} (seu: ${callerLevel}).` },
        { status: 403 },
      );
    }
    if (target.id === auth.user.id) {
      return NextResponse.json({ error: "Você não pode alterar o próprio cargo." }, { status: 400 });
    }
    patch.roleId = newRoleId;
    // se o novo cargo tem accessPanel, marca como admin (legado)
    patch.role = newRole.permissions.accessPanel ? "admin" : "user";

    // se virou cargo com accessPanel e não tem 2FA, gera
    if (newRole.permissions.accessPanel && !target.totpSecret) {
      newSecret = generateTotpSecret();
      patch.totpSecret = newSecret;
      newQr = await QRCode.toDataURL(totpUri(target.email, newSecret), {
        margin: 1, width: 300, color: { dark: "#0a0a0d", light: "#ffffff" },
      });
    }
  }

  /* ---- dados básicos ---- */
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 80);
  }
  if (typeof body.password === "string" && body.password.length >= 8) {
    patch.passwordHash = hashPassword(body.password);
  }

  const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  publish({ type: "users", action: "updated", id });

  return NextResponse.json({ user: await toSafeUser(updated), qr: newQr, secret: newSecret });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, "manageUsers");
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  if (id === auth.user.id) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const callerLevel = await getUserLevel(auth.user);
  const targetLevel = await getUserLevel(target);
  if (targetLevel >= callerLevel) {
    return NextResponse.json({ error: "Não pode excluir conta com cargo de nível igual ou acima do seu." }, { status: 403 });
  }

  await db.delete(users).where(eq(users.id, id));
  publish({ type: "users", action: "deleted", id });

  return NextResponse.json({ ok: true });
}
