import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { toMediaDTO } from "@/lib/story";
import type { MediaDTO } from "@/lib/types";

export type LibraryItem = MediaDTO & { originalName: string; createdAt: string; size: number; usage: number };

export async function loadLibrary(): Promise<LibraryItem[]> {
  const [rows, usage] = await Promise.all([
    db.select().from(schema.media).orderBy(desc(schema.media.createdAt)),
    db.select({ mediaId: schema.memoryMedia.mediaId, n: sql<number>`count(*)::int` }).from(schema.memoryMedia).groupBy(schema.memoryMedia.mediaId),
  ]);
  const u = new Map(usage.map((x) => [x.mediaId, x.n]));
  return rows.map((m) => ({ ...toMediaDTO(m), originalName: m.originalName, createdAt: m.createdAt.toISOString(), size: m.size, usage: u.get(m.id) ?? 0 }));
}

export async function loadStages() {
  return db.select().from(schema.stages).orderBy(asc(schema.stages.order));
}

export type ChapterOption = { target: string; title: string; kicker: string; accent: string; wash: string; custom: boolean };

/** Capítulos donde se puede poner un recuerdo (los de la historia, salvo Cartas, y los creados por la familia). */
export async function loadChapterOptions(): Promise<ChapterOption[]> {
  const { SCENES, SCENE_META } = await import("@/lib/constants");
  const [configs, custom] = await Promise.all([db.select().from(schema.sceneConfigs), db.select().from(schema.chapters).orderBy(asc(schema.chapters.order), asc(schema.chapters.createdAt))]);
  const out: ChapterOption[] = [];
  for (const s of SCENES) {
    if (s !== "CARTAS") {
      const c = configs.find((r) => r.scene === s);
      out.push({ target: s, title: c?.title ?? SCENE_META[s].title, kicker: c?.subtitle ?? SCENE_META[s].chapter, accent: SCENE_META[s].accent, wash: SCENE_META[s].wash, custom: false });
    }
    for (const c of custom.filter((x) => x.afterScene === s)) {
      out.push({ target: `c:${c.id}`, title: c.title, kicker: c.subtitle ?? "Capítulo de la familia", accent: c.color, wash: `${c.color}1c`, custom: true });
    }
  }
  return out;
}
