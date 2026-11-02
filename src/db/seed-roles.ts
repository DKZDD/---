import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { roles, users, type Permissions } from "./schema";

const SYSTEM_ROLES: {
  name: string;
  level: number;
  color: string;
  icon: string;
  permissions: Permissions;
}[] = [
  {
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
  },
  {
    name: "Admin",
    level: 80,
    color: "#3b82f6",
    icon: "Shield",
    permissions: {
      accessPanel: true,
      manageVideos: true,
      manageUsers: true,
      manageVip: true,
      manageRoles: false,
      assignRoles: true,
      managePlans: true,
      manageAds: true,
      manageChat: true,
      manageSettings: true,
      viewVipContent: true,
    },
  },
  {
    name: "Moderador",
    level: 50,
    color: "#a855f7",
    icon: "ShieldCheck",
    permissions: {
      accessPanel: true,
      manageVideos: true,
      manageUsers: false,
      manageVip: false,
      manageRoles: false,
      assignRoles: false,
      managePlans: false,
      manageAds: false,
      manageChat: true,
      manageSettings: false,
      viewVipContent: true,
    },
  },
  {
    name: "VIP",
    level: 10,
    color: "#ffd21a",
    icon: "Gem",
    permissions: {
      accessPanel: false,
      manageVideos: false,
      manageUsers: false,
      manageVip: false,
      manageRoles: false,
      assignRoles: false,
      managePlans: false,
      manageAds: false,
      manageChat: false,
      manageSettings: false,
      viewVipContent: true,
    },
  },
  {
    name: "Membro",
    level: 0,
    color: "#71717a",
    icon: "User",
    permissions: {
      accessPanel: false,
      manageVideos: false,
      manageUsers: false,
      manageVip: false,
      manageRoles: false,
      assignRoles: false,
      managePlans: false,
      manageAds: false,
      manageChat: false,
      manageSettings: false,
      viewVipContent: false,
    },
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  for (const r of SYSTEM_ROLES) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(sql`${roles.name} = ${r.name}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values({ ...r, isSystem: true });
      console.log(`Cargo criado: ${r.name} (nível ${r.level})`);
    } else {
      console.log(`Cargo já existe: ${r.name}`);
    }
  }

  const [ownerRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(sql`${roles.name} = 'Dono'`)
    .limit(1);

  if (ownerRole) {
    const admins = await db
      .select()
      .from(users)
      .where(sql`${users.role} = 'admin' AND ${users.roleId} IS NULL`);

    for (const admin of admins) {
      await db
        .update(users)
        .set({ roleId: ownerRole.id })
        .where(sql`${users.id} = ${admin.id}`);
      console.log(`Admin ${admin.email} → cargo Dono`);
    }
  }

  const [membroRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(sql`${roles.name} = 'Membro'`)
    .limit(1);

  if (membroRole) {
    await db
      .update(users)
      .set({ roleId: membroRole.id })
      .where(sql`${users.roleId} IS NULL AND ${users.role} != 'admin'`);
    console.log("Usuários sem cargo → Membro");
  }

  await pool.end();
  console.log("Seed de cargos concluído!");
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
