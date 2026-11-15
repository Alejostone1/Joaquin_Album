// Copia de seguridad completa: base de datos (JSON por tabla) + todos los archivos privados.
// Uso: npm run backup            → crea backups/AAAA-MM-DD_HHMM/
//      npm run backup -- --restore backups/AAAA-MM-DD_HHMM   → restaura (¡reemplaza los datos actuales!)
import "./env.mts";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const TABLES = ["users", "stages", "media", "memories", "memory_media", "milestones", "letters", "birth_info", "scene_configs"];

async function backup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  const dir = path.resolve("backups", stamp);
  await mkdir(path.join(dir, "db"), { recursive: true });
  for (const t of TABLES) {
    const { rows } = await pool.query(`select * from "${t}"`);
    await writeFile(path.join(dir, "db", `${t}.json`), JSON.stringify(rows, null, 1));
    console.log(`  ${t}: ${rows.length} filas`);
  }
  const storage = path.resolve(process.env.STORAGE_DIR || "./storage", "uploads");
  if (existsSync(storage)) await cp(storage, path.join(dir, "uploads"), { recursive: true });
  await pool.end();
  console.log(`✓ Copia lista en ${dir}`);
  console.log("  Guárdala también fuera de este equipo (disco externo o nube privada).");
}

async function restore(dir: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`truncate ${TABLES.map((t) => `"${t}"`).join(", ")}, "sessions" cascade`);
    for (const t of TABLES) {
      const file = path.join(dir, "db", `${t}.json`);
      if (!existsSync(file)) continue;
      const rows = JSON.parse(await readFile(file, "utf8")) as Array<Record<string, unknown>>;
      for (const row of rows) {
        const cols = Object.keys(row);
        await client.query(
          `insert into "${t}" (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
          cols.map((c) => row[c]),
        );
      }
      console.log(`  ${t}: ${rows.length} filas`);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  const src = path.join(dir, "uploads");
  if (existsSync(src)) await cp(src, path.resolve(process.env.STORAGE_DIR || "./storage", "uploads"), { recursive: true });
  await pool.end();
  console.log("✓ Restauración completa");
}

const i = process.argv.indexOf("--restore");
(i >= 0 ? restore(path.resolve(process.argv[i + 1] ?? "")) : backup()).catch((e) => {
  console.error(e);
  process.exit(1);
});
