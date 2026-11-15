// Datos iniciales: primer administrador, etapas, textos de escenas y las
// fotografías reales de la habitación de Joaquín (carpeta seed-photos/).
import "./env.mts";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../db/schema.ts";
import { SCENE_META, SCENES } from "../lib/constants.ts";
import { ingestFile, USE_BLOB } from "../lib/storage.ts";
import { poolConfig } from "../lib/pg-config.ts";

async function main() {
  const pool = new Pool(poolConfig(1));
  const db = drizzle(pool, { schema });

  // 1. Administrador
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  let adminId: string | undefined;
  if (email && password) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (existing) {
      adminId = existing.id;
      console.log(`• El administrador ${email} ya existe`);
    } else {
      if (password.length < 8) throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres");
      const [u] = await db
        .insert(schema.users)
        .values({
          name: process.env.ADMIN_NAME || "Administrador",
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: "ADMIN",
        })
        .returning();
      adminId = u.id;
      console.log(`✓ Administrador creado: ${email}`);
    }
  } else {
    console.log("• Sin ADMIN_EMAIL / ADMIN_PASSWORD: no se creó administrador");
  }

  // 2. Textos de las escenas
  for (const scene of SCENES) {
    const m = SCENE_META[scene];
    await db
      .insert(schema.sceneConfigs)
      .values({ scene, title: m.title, phrase: m.phrase, subtitle: m.chapter })
      .onConflictDoNothing();
  }

  // 3. Datos del nacimiento (vacíos: la familia los completa)
  await db.insert(schema.birthInfo).values({ id: 1 }).onConflictDoNothing();

  // 4. Etapas
  const stageCount = await db.$count(schema.stages);
  let beforeStageId: string | undefined;
  if (stageCount === 0) {
    const stages = [
      ["Antes de nacer", "#A8C3A0"],
      ["Recién nacido", "#FF8A7A"],
      ["1 a 3 meses", "#1FB5B0"],
      ["4 a 6 meses", "#F2A516"],
      ["7 a 12 meses", "#E86A9A"],
      ["Primer año", "#3C9BE0"],
      ["Segundo año", "#FF9F68"],
    ] as const;
    const rows = await db
      .insert(schema.stages)
      .values(stages.map(([name, color], order) => ({ name, color, order })))
      .returning();
    beforeStageId = rows[0].id;
    console.log(`✓ ${rows.length} etapas creadas`);
  }

  // 5. Fotografías reales de la preparación
  const mediaCount = await db.$count(schema.media);
  const dir = path.resolve("seed-photos");
  if (mediaCount === 0 && existsSync(dir)) {
    const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    const ids: Record<string, string> = {};
    for (const file of files) {
      const ing = USE_BLOB
        ? await (await import("../lib/blob.ts")).blobIngestBuffer(readFileSync(path.join(dir, file)), file)
        : await ingestFile(path.join(dir, file), { deleteSource: false });
      const [row] = await db
        .insert(schema.media)
        .values({ ...ing, originalName: file, createdById: adminId, alt: altFor(file) })
        .returning();
      ids[file] = row.id;
    }
    console.log(`✓ ${files.length} fotografías importadas`);

    const plan: Array<{
      title: string;
      description: string;
      files: string[];
      presentation: (typeof schema.presentationEnum.enumValues)[number];
      tags: string[];
    }> = [
      {
        title: "La cuna lista",
        description: "Sábanas blancas, un cojín con tu nombre y un peluche esperando compañía.",
        files: ["cuna-cuadros.jpg"],
        presentation: "CINEMATIC",
        tags: ["habitación", "cuna"],
      },
      {
        title: "Un cuarto lleno de dinosaurios",
        description:
          "Un estegosaurio, un triceratops y un pequeño pterodáctilo ya cuidaban la pared antes de que llegaras.",
        files: ["rincon-cuna.jpg", "colgante-dinosaurios.jpg"],
        presentation: "OVERLAP",
        tags: ["habitación", "decoración"],
      },
      {
        title: "Tu primer enterizo",
        description: "Tejido en gris, con orejas de conejo, una colita de algodón y tu nombre bordado: Joaquín.",
        files: ["enterizo-joaquin.jpg"],
        presentation: "MASK",
        tags: ["ropa"],
      },
    ];
    let order = 0;
    for (const p of plan) {
      const mediaIds = p.files.map((f) => ids[f]).filter(Boolean);
      if (!mediaIds.length) continue;
      const [mem] = await db
        .insert(schema.memories)
        .values({
          title: p.title,
          description: p.description,
          scene: "ANTES",
          presentation: p.presentation,
          tags: p.tags,
          status: "PUBLISHED",
          order: order++,
          coverId: mediaIds[0],
          stageId: beforeStageId,
          createdById: adminId,
        })
        .returning();
      await db.insert(schema.memoryMedia).values(mediaIds.map((mediaId, i) => ({ memoryId: mem.id, mediaId, order: i })));
    }
    console.log(`✓ ${plan.length} recuerdos de "Antes de conocerte" creados`);
  }

  await pool.end();
  console.log("Listo. Su historia comienza aquí.");
}

function altFor(file: string) {
  if (file.includes("cuna-cuadros")) return "Cuna blanca con cojines de dinosaurios y tres cuadros en la pared";
  if (file.includes("rincon")) return "Rincón de la habitación con la cuna y el colgante de dinosaurios";
  if (file.includes("colgante")) return "Colgante de tela con estegosaurio, triceratops y pterodáctilo acuarelados";
  if (file.includes("enterizo")) return "Enterizo tejido gris con orejas de conejo y el nombre Joaquín bordado";
  return file;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
