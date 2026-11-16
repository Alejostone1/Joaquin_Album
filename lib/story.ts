import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hasRole, type SessionUser } from "@/lib/auth";
import { SCENE_META, SCENES, type PresentationId } from "@/lib/constants";
import { signedMediaUrl } from "@/lib/storage";
import type { BirthDTO, ChapterDTO, Companion, LetterDTO, MediaDTO, MilestoneDTO, StoryData } from "@/lib/types";
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

const SINGLE: PresentationId[] = ["CINEMATIC", "ZOOM", "REVEAL", "MASK", "PARALLAX", "EDITORIAL"];
const FEW: PresentationId[] = ["CINEMATIC", "DECK", "OVERLAP", "STORYBOOK", "SEQUENCE", "SCRAPBOOK"];
const MANY: PresentationId[] = ["CINEMATIC", "CAROUSEL", "COLLAGE", "SCRAPBOOK", "BUBBLES", "DECK", "SEQUENCE"];

/** "Automático": elige un estilo según la cantidad de fotos, sin repetir el anterior. */
export function resolvePresentation(chosen: PresentationId, mediaCount: number, index: number, previous?: string) {
  if (chosen !== "AUTO") return chosen as Exclude<PresentationId, "AUTO">;
  const pool = mediaCount <= 1 ? SINGLE : mediaCount <= 3 ? FEW : MANY;
  let pick = pool[index % pool.length];
  if (pick === previous) pick = pool[(index + 1) % pool.length];
  return pick as Exclude<PresentationId, "AUTO">;
}

/** Aclara un color hacia el papel para el fondo acuarelado del capítulo. */
function washOf(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.86);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
const slugify = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "capitulo";

export type Viewer = SessionUser | { guest: true; label: string };
const isGuest = (v: Viewer): v is { guest: true; label: string } => "guest" in v;

const today = () => new Date().toISOString().slice(0, 10);

export async function getStoryData(who: Viewer, opts: { preview?: boolean } = {}): Promise<StoryData> {
  const guest = isGuest(who);
  const viewer: SessionUser = guest ? { id: "guest", name: who.label, email: "", role: "FAMILY", relation: null } : who;
  const canPreview = !guest && hasRole(viewer, "EDITOR") && !!opts.preview;

  const [sceneRows, chapterRows, memoryRows, birthRow, milestoneRows, letterRows] = await Promise.all([
    db.select().from(schema.sceneConfigs),
    db.select().from(schema.chapters).orderBy(asc(schema.chapters.order), asc(schema.chapters.createdAt)),
    db.query.memories.findMany({
      where: canPreview ? undefined : eq(schema.memories.status, "PUBLISHED"),
      orderBy: [asc(schema.memories.order), asc(schema.memories.date), asc(schema.memories.createdAt)],
      with: {
        stage: true,
        cover: true,
        author: { columns: { name: true, relation: true } },
        editor: { columns: { name: true, relation: true } },
        media: { with: { media: true }, orderBy: [asc(schema.memoryMedia.order)] },
      },
    }),
    db.query.birthInfo.findFirst({ with: { mainPhoto: true } }),
    db.query.milestones.findMany({
      where: canPreview ? undefined : eq(schema.milestones.status, "PUBLISHED"),
      orderBy: [asc(schema.milestones.date)],
      with: { media: true, stage: true },
    }),
    // las cartas son íntimas: no se muestran a quien entra con un enlace de invitado
    guest
      ? Promise.resolve([] as Array<typeof schema.letters.$inferSelect>)
      : db.query.letters.findMany({
          where: hasRole(viewer, "ADMIN") ? undefined : inArray(schema.letters.status, ["PUBLISHED"]),
          orderBy: [desc(schema.letters.createdAt)],
        }),
  ]);

  // capítulos de la historia + capítulos creados por la familia (cada uno después del que eligieron)
  const chapters: ChapterDTO[] = [];
  const byKey = new Map<string, ChapterDTO>();
  for (const id of SCENES) {
    const row = sceneRows.find((r) => r.scene === id);
    const meta = SCENE_META[id];
    if (!(row?.enabled ?? true)) continue;
    if (guest && id === "CARTAS") continue;
    const ch: ChapterDTO = {
      key: id,
      slug: meta.slug,
      builtin: id,
      target: id,
      title: row?.title ?? meta.title,
      phrase: row?.phrase ?? meta.phrase,
      subtitle: row?.subtitle ?? meta.chapter,
      accent: meta.accent,
      wash: meta.wash,
      companion: meta.companion,
      memories: [],
    };
    chapters.push(ch);
    byKey.set(id, ch);
    for (const c of chapterRows.filter((c) => c.afterScene === id && c.enabled)) {
      const custom: ChapterDTO = {
        key: `c:${c.id}`,
        slug: `${slugify(c.title)}-${c.id.slice(0, 4)}`,
        builtin: null,
        target: `c:${c.id}`,
        title: c.title,
        subtitle: c.subtitle,
        phrase: c.phrase,
        accent: c.color,
        wash: washOf(c.color),
        companion: (["stego", "trice", "ptero", "baby"].includes(c.companion) ? c.companion : "stego") as Companion,
        memories: [],
      };
      chapters.push(custom);
      byKey.set(custom.key, custom);
    }
  }
  // si el capítulo base está oculto, los creados por la familia siguen visibles al final
  for (const c of chapterRows) if (c.enabled && !byKey.has(`c:${c.id}`)) {
    const custom: ChapterDTO = { key: `c:${c.id}`, slug: `${slugify(c.title)}-${c.id.slice(0, 4)}`, builtin: null, target: `c:${c.id}`, title: c.title, subtitle: c.subtitle, phrase: c.phrase, accent: c.color, wash: washOf(c.color), companion: "stego", memories: [] };
    chapters.splice(Math.max(0, chapters.length - (guest ? 0 : 1)), 0, custom);
    byKey.set(custom.key, custom);
  }

  for (const m of memoryRows) {
    const list = (m.chapterId && byKey.get(`c:${m.chapterId}`)?.memories) || byKey.get(m.scene)?.memories;
    if (!list) continue;
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
      author: m.author ? { name: m.author.name, relation: m.author.relation } : null,
      editor: m.editor && m.editor.name !== m.author?.name ? { name: m.editor.name, relation: m.editor.relation } : null,
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
    viewer: { id: viewer.id, name: viewer.name, role: viewer.role, relation: viewer.relation, guest },
    preview: canPreview,
    chapters,
    birth,
    milestones,
    letters,
  };
}
