import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hasRole, type SessionUser } from "@/lib/auth";
import { SCENE_META, SCENES, type PresentationId, type SceneId } from "@/lib/constants";
import { signedMediaUrl } from "@/lib/storage";
import type { BirthDTO, LetterDTO, MediaDTO, MemoryDTO, MilestoneDTO, StoryData } from "@/lib/types";
import type { Media } from "@/db/schema";

export function toMediaDTO(m: Media): MediaDTO {
  const isImg = m.kind === "IMAGE";
  return {
    id: m.id,
    kind: m.kind,
    mimeType: m.mimeType,
    sm: signedMediaUrl(m.id, isImg ? "sm" : "orig"),
    md: signedMediaUrl(m.id, isImg ? "md" : "orig"),
    lg: signedMediaUrl(m.id, isImg ? "lg" : "orig"),
    orig: signedMediaUrl(m.id, "orig"),
    blur: m.blurDataUrl,
    width: m.width,
    height: m.height,
    alt: m.alt || m.caption || "Recuerdo de Joaquín",
    caption: m.caption,
  };
}

const SINGLE: PresentationId[] = ["CINEMATIC", "ZOOM", "REVEAL", "EDITORIAL", "MASK", "PARALLAX"];
const FEW: PresentationId[] = ["OVERLAP", "SEQUENCE", "EDITORIAL"];
const MANY: PresentationId[] = ["COLLAGE", "SEQUENCE", "OVERLAP"];

/** "Automático": elige un estilo según la cantidad de fotos, sin repetir el anterior. */
export function resolvePresentation(chosen: PresentationId, mediaCount: number, index: number, previous?: string) {
  if (chosen !== "AUTO") return chosen as Exclude<PresentationId, "AUTO">;
  const pool = mediaCount <= 1 ? SINGLE : mediaCount <= 3 ? FEW : MANY;
  let pick = pool[index % pool.length];
  if (pick === previous) pick = pool[(index + 1) % pool.length];
  return pick as Exclude<PresentationId, "AUTO">;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function getStoryData(viewer: SessionUser, opts: { preview?: boolean } = {}): Promise<StoryData> {
  const canPreview = hasRole(viewer, "EDITOR") && !!opts.preview;

  const [sceneRows, memoryRows, birthRow, milestoneRows, letterRows] = await Promise.all([
    db.select().from(schema.sceneConfigs),
    db.query.memories.findMany({
      where: canPreview ? undefined : eq(schema.memories.status, "PUBLISHED"),
      orderBy: [asc(schema.memories.order), asc(schema.memories.date), asc(schema.memories.createdAt)],
      with: { stage: true, cover: true, media: { with: { media: true }, orderBy: [asc(schema.memoryMedia.order)] } },
    }),
    db.query.birthInfo.findFirst({ with: { mainPhoto: true } }),
    db.query.milestones.findMany({
      where: canPreview ? undefined : eq(schema.milestones.status, "PUBLISHED"),
      orderBy: [asc(schema.milestones.date)],
      with: { media: true, stage: true },
    }),
    db.query.letters.findMany({
      where: hasRole(viewer, "ADMIN") ? undefined : inArray(schema.letters.status, ["PUBLISHED"]),
      orderBy: [desc(schema.letters.createdAt)],
    }),
  ]);

  const scenes = SCENES.map((id) => {
    const row = sceneRows.find((r) => r.scene === id);
    return {
      id,
      title: row?.title ?? SCENE_META[id].title,
      phrase: row?.phrase ?? SCENE_META[id].phrase,
      subtitle: row?.subtitle ?? SCENE_META[id].chapter,
      enabled: row?.enabled ?? true,
    };
  });

  const memories = Object.fromEntries(SCENES.map((s) => [s, [] as MemoryDTO[]])) as Record<SceneId, MemoryDTO[]>;
  for (const m of memoryRows) {
    const list = memories[m.scene];
    let media = m.media.map((l) => toMediaDTO(l.media));
    // la portada va primero
    if (m.coverId) media = [...media.filter((x) => x.id === m.coverId), ...media.filter((x) => x.id !== m.coverId)];
    const prev = list[list.length - 1]?.presentation;
    list.push({
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.date,
      scene: m.scene,
      presentation: resolvePresentation(m.presentation, media.length, list.length, prev),
      tags: m.tags,
      status: m.status,
      stage: m.stage ? { name: m.stage.name, color: m.stage.color } : null,
      media,
    });
  }

  const b = birthRow;
  const birth: BirthDTO = {
    birthDate: b?.birthDate ?? null,
    birthTime: b?.birthTime ?? null,
    weight: b?.weight ?? null,
    height: b?.height ?? null,
    place: b?.place ?? null,
    firstMeeting: b?.firstMeeting ?? null,
    note: b?.note ?? null,
    mainPhoto: b?.mainPhoto ? toMediaDTO(b.mainPhoto) : null,
  };

  const milestones: MilestoneDTO[] = milestoneRows.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    description: m.description,
    date: m.date,
    status: m.status,
    media: m.media ? toMediaDTO(m.media) : null,
    stage: m.stage ? { name: m.stage.name, color: m.stage.color } : null,
  }));

  // Cartas selladas: el texto no sale del servidor hasta su fecha (salvo para quien la escribió)
  const now = today();
  const letters: LetterDTO[] = letterRows.map((l) => {
    const sealed = !!l.openAt && l.openAt > now;
    const mine = l.authorId === viewer.id;
    return {
      id: l.id,
      authorName: l.authorName,
      relation: l.relation,
      body: sealed && !mine ? null : l.body,
      openAt: l.openAt,
      sealed,
      mine,
      createdAt: l.createdAt.toISOString(),
    };
  });

  return {
    viewer: { id: viewer.id, name: viewer.name, role: viewer.role, relation: viewer.relation },
    preview: canPreview,
    scenes,
    memories,
    birth,
    milestones,
    letters,
  };
}
