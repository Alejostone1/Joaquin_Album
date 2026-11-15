// Aplica las migraciones SQL de db/migrations.
// Con DB_SCHEMA (p. ej. Supabase con esquema aislado) usa un migrador mínimo que
// no necesita permisos para crear esquemas: el registro vive en <DB_SCHEMA>.__drizzle_migrations.
import "./env.mts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { DB_SCHEMA, poolConfig } from "../lib/pg-config.ts";

type Journal = { entries: Array<{ idx: number; when: number; tag: string }> };

async function schemaMigrate(pool: Pool, schema: string) {
  const s = `"${schema.replace(/"/g, "")}"`;
  const client = await pool.connect();
  try {
    await client.query(`set search_path to ${s}`);
    await client.query(`create table if not exists ${s}.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`);
    const { rows } = await client.query(`select created_at from ${s}.__drizzle_migrations order by created_at desc limit 1`);
    const last = rows[0] ? Number(rows[0].created_at) : 0;
    const journal = JSON.parse(readFileSync("./db/migrations/meta/_journal.json", "utf8")) as Journal;
    for (const e of journal.entries) {
      if (e.when <= last) continue;
      const sql = readFileSync(`./db/migrations/${e.tag}.sql`, "utf8");
      await client.query("begin");
      try {
        for (const stmt of sql.split("--> statement-breakpoint")) if (stmt.trim()) await client.query(stmt);
        await client.query(`insert into ${s}.__drizzle_migrations (hash, created_at) values ($1, $2)`, [createHash("sha256").update(sql).digest("hex"), e.when]);
        await client.query("commit");
        console.log(`  aplicada ${e.tag}`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const pool = new Pool(poolConfig(1));
  if (DB_SCHEMA) await schemaMigrate(pool, DB_SCHEMA);
  else await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
  console.log("✓ Base de datos al día");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
