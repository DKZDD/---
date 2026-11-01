import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Detecta se estamos em build da Vercel (fase "collecting page data").
 * Nela, o Next importa módulos só para medir rotas, e não existe runtime de banco.
 */
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function init() {
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  poolInstance = new Pool({ connectionString: url });
  dbInstance = drizzle(poolInstance);
  return dbInstance;
}

/**
 * Cliente final. No build, exportamos um Proxy que retorna uma promise
 * resolvida para qualquer chamada (sobrevive à coleta de rotas sem DB).
 * Em runtime real, é o Drizzle normal.
 */
function createBuildProxy(): ReturnType<typeof drizzle> {
  const dummy = new Proxy(
    {},
    {
      get() {
        return async () => [];
      },
    },
  ) as unknown as ReturnType<typeof drizzle>;
  return dummy;
}

export const db: ReturnType<typeof drizzle> = init() ?? (isBuildPhase ? createBuildProxy() : (() => { throw new Error("DATABASE_URL is missing in runtime"); })());

/** Helper para healthcheck e lugares que precisam de erro explícito. */
export function requireDb() {
  return init() ?? (() => { throw new Error("DATABASE_URL is missing in runtime"); })();
}

export { poolInstance as pool };
