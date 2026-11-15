import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { poolConfig } from "@/lib/pg-config";

const globalForDb = globalThis as unknown as { __joaquinPool?: Pool };

// Con DB_SCHEMA, el search_path lo fija el propio rol de la base de datos
// (ALTER ROLE … SET search_path), así funciona también a través de poolers.
function createPool() {
  return new Pool(poolConfig(process.env.VERCEL ? 3 : 10));
}

const pool = globalForDb.__joaquinPool ?? createPool();
globalForDb.__joaquinPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
