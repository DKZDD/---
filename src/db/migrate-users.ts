import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Move os administradores da tabela antiga (admin_users) para a nova
 * tabela unificada `users`, preservando e-mail, senha e segredo 2FA.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const hasOld = await db.execute(sql`
    SELECT to_regclass('public.admin_users') AS t
  `);
  const exists = (hasOld.rows[0] as { t: string | null } | undefined)?.t;

  if (exists) {
    const res = await db.execute(sql`
      INSERT INTO users (name, email, password_hash, totp_secret, role, plan, status, created_at)
      SELECT
        split_part(email, '@', 1),
        email,
        password_hash,
        totp_secret,
        'admin',
        'vip',
        'active',
        created_at
      FROM admin_users
      ON CONFLICT (email) DO NOTHING
    `);
    console.log(`Administradores migrados: ${res.rowCount ?? 0}`);
  } else {
    console.log("Tabela admin_users não existe — nada a migrar.");
  }

  const admins = await db.execute(sql`
    SELECT email, role, plan FROM users WHERE role = 'admin'
  `);
  console.log("Admins atuais:", admins.rows);

  await pool.end();
}

main().catch((err) => {
  console.error("Falha na migração:", err);
  process.exit(1);
});
