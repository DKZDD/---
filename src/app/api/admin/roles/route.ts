import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { roles, type Permissions, ALL_PERMISSIONS, NO_PERMISSIONS } from "@/db/schema";
import { getUserLevel, requirePermission, invalidateRoleCache } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "accessPanel");
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const all = await db.select().from(roles).orderBy(asc(roles.level));
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manageRoles");
  if (!auth) return NextResponse.json({ error: "Sem permissão para gerenciar cargos." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const name = String(body.name ?? "").trim().slice(0, 40);
  const level = Math.max(0, Math.min(99, Number(body.level ?? 0)));
  const color = String(body.color ?? "#71717a").trim();
  const icon = String(body.icon ?? "User").trim();

  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

  // hierarquia: não pode criar cargo com nível >= ao seu
  const callerLevel = await getUserLevel(auth.user);
  if (level >= callerLevel) {
    return NextResponse.json(
      { error: `Você (nível ${callerLevel}) não pode criar um cargo de nível ${level} ou acima.` },
      { status: 403 },
    );
  }

  const permissions: Permissions = { ...NO_PERMISSIONS };
  if (typeof body.permissions === "object" && body.permissions) {
    for (const k of ALL_PERMISSIONS) {
      if ((body.permissions as Record<string, unknown>)[k] === true) {
        permissions[k] = true;
      }
    }
  }

  // não pode dar permissões que não tem
  for (const k of ALL_PERMISSIONS) {
    if (permissions[k] && !auth.perms[k]) {
      return NextResponse.json(
        { error: `Você não tem a permissão "${k}" para concedê-la a um cargo.` },
        { status: 403 },
      );
    }
  }

  try {
    const [created] = await db.insert(roles).values({ name, level, color, icon, permissions, isSystem: false }).returning();
    invalidateRoleCache();
    publish({ type: "users", action: "updated" });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Já existe um cargo com este nome." }, { status: 409 });
    }
    throw err;
  }
}
