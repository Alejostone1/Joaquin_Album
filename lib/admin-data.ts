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
