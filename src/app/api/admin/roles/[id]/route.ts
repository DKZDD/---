import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users, type Permissions, ALL_PERMISSIONS, NO_PERMISSIONS } from "@/db/schema";
import { getUserLevel, requirePermission, getRoleById, invalidateRoleCache } from "@/lib/auth";
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
  const auth = await requirePermission(request, "manageRoles");
  if (!auth) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const target = await getRoleById(id);
  if (!target) return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });

  const callerLevel = await getUserLevel(auth.user);

  // não pode editar cargo de nível >= ao seu
  if (target.level >= callerLevel) {
    return NextResponse.json(
      { error: "Você não pode editar um cargo de nível igual ou acima do seu." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 40);
  }
  if (typeof body.level === "number") {
    const newLevel = Math.max(0, Math.min(99, body.level));
    if (newLevel >= callerLevel) {
      return NextResponse.json(
        { error: `Não pode elevar o cargo ao nível ${newLevel} (seu nível: ${callerLevel}).` },
        { status: 403 },
      );
    }
    patch.level = newLevel;
  }
  if (typeof body.color === "string") patch.color = body.color.trim();
  if (typeof body.icon === "string") patch.icon = body.icon.trim();

  if (typeof body.permissions === "object" && body.permissions) {
    const permissions: Permissions = { ...NO_PERMISSIONS };
    for (const k of ALL_PERMISSIONS) {
      if ((body.permissions as Record<string, unknown>)[k] === true) {
        if (!auth.perms[k]) {
          return NextResponse.json(
            { error: `Você não tem "${k}" para concedê-la.` },
            { status: 403 },
          );
        }
        permissions[k] = true;
      }
    }
    patch.permissions = permissions;
  }

  try {
    const [updated] = await db.update(roles).set(patch).where(eq(roles.id, id)).returning();
    invalidateRoleCache();
    publish({ type: "users", action: "updated" });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Já existe um cargo com este nome." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, "manageRoles");
  if (!auth) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const target = await getRoleById(id);
  if (!target) return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });

  if (target.isSystem) {
    return NextResponse.json({ error: "Cargos do sistema não podem ser excluídos." }, { status: 400 });
  }

  const callerLevel = await getUserLevel(auth.user);
  if (target.level >= callerLevel) {
    return NextResponse.json({ error: "Não pode excluir cargo de nível igual ou acima do seu." }, { status: 403 });
  }

  // rebaixa todos com esse cargo para "Membro"
  const [membro] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "Membro")).limit(1);
  if (membro) {
    await db.update(users).set({ roleId: membro.id }).where(eq(users.roleId, id));
  }

  await db.delete(roles).where(eq(roles.id, id));
  invalidateRoleCache();
  publish({ type: "users", action: "updated" });

  return NextResponse.json({ ok: true });
}
