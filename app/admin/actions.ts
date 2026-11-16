"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser, hashPassword, verifyPassword } from "@/lib/auth";
import { MILESTONE_TYPES, PRESENTATIONS, ROLE_LABELS, SCENES } from "@/lib/constants";
import { db, schema } from "@/lib/db";
import { deleteStoredMedia } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { SCENE_META } from "@/lib/constants";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
async function chapterName(scene: string, chapterId: string | null) {
  if (chapterId) {
    const c = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
    if (c) return c.title;
  }
  const row = await db.query.sceneConfigs.findFirst({ where: eq(schema.sceneConfigs.scene, scene as (typeof SCENES)[number]) });
  return row?.title ?? SCENE_META[scene as (typeof SCENES)[number]]?.title ?? "la historia";
}

export type ActionResult = { ok: boolean; error?: string; id?: string; message?: string };

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha válida.")
  .optional()
  .or(z.literal("").transform(() => undefined));
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

function refresh(...paths: string[]) {
  revalidatePath("/historia");
  revalidatePath("/admin", "layout");
  for (const p of paths) revalidatePath(p);
}

async function guard<T>(fn: () => Promise<T>): Promise<T | ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Revisa los datos." };
    console.error(e);
    return { ok: false, error: "Algo salió mal al guardar. Inténtalo de nuevo." };
  }
}

// ——— Recuerdos ———
/** "ANTES" → capítulo de la historia · "c:<id>" → capítulo creado por la familia */
function parseTarget(v: string): { scene: string; chapterId?: string } {
  if (v.startsWith("c:")) return { scene: "AVENTURAS", chapterId: v.slice(2) };
  return { scene: v };
}
const MemorySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Ponle un título al recuerdo.").max(140),
  description: optText(4000),
  date: dateStr,
  scene: z.enum(SCENES),
  chapterId: z.string().optional().transform((v) => v || null),
  presentation: z.enum(PRESENTATIONS),
  stageId: z.string().optional().transform((v) => v || null),
  tags: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  mediaIds: z.array(z.string()).max(60),
  coverId: z.string().optional().transform((v) => v || null),
});

export async function saveMemory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const data = MemorySchema.parse({
      id: form.get("id") || undefined,
      title: form.get("title"),
      description: form.get("description") ?? undefined,
      date: form.get("date") ?? undefined,
      ...parseTarget(String(form.get("scene") ?? "")),
      presentation: form.get("presentation"),
      stageId: form.get("stageId") ?? undefined,
      tags: form.get("tags") ?? undefined,
      status: form.get("status"),
      mediaIds: form.getAll("mediaIds").map(String),
      coverId: form.get("coverId") ?? undefined,
    });
    const tags = (data.tags ?? "")
      .split(",")
      .map((t) => t.trim().replace(/^#/, "").toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    const coverId = data.coverId && data.mediaIds.includes(data.coverId) ? data.coverId : (data.mediaIds[0] ?? null);
    let scene = data.scene;
    if (data.chapterId) {
      const ch = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, data.chapterId) });
      if (!ch) return { ok: false, error: "Ese capítulo ya no existe." };
      scene = ch.afterScene;
    }
    const prev = data.id ? await db.query.memories.findFirst({ where: eq(schema.memories.id, data.id) }) : null;
    const values = {
      title: data.title,
      description: data.description,
      date: data.date ?? null,
      scene,
      chapterId: data.chapterId,
      updatedById: user.id,
      presentation: data.presentation,
      stageId: data.stageId,
      tags,
      status: data.status,
      coverId,
    };
    const id = await db.transaction(async (tx) => {
      let memoryId = data.id;
      if (memoryId) {
        const [row] = await tx.update(schema.memories).set(values).where(eq(schema.memories.id, memoryId)).returning({ id: schema.memories.id });
        if (!row) throw new AuthError(403, "Ese recuerdo ya no existe.");
        await tx.delete(schema.memoryMedia).where(eq(schema.memoryMedia.memoryId, memoryId));
      } else {
        const count = await tx.$count(schema.memories, eq(schema.memories.scene, scene));
        const [row] = await tx.insert(schema.memories).values({ ...values, order: count, createdById: user.id }).returning({ id: schema.memories.id });
        memoryId = row.id;
      }
      if (data.mediaIds.length) {
        await tx.insert(schema.memoryMedia).values(data.mediaIds.map((mediaId, order) => ({ memoryId: memoryId!, mediaId, order })));
      }
      return memoryId!;
    });
    const where = await chapterName(scene, data.chapterId);
    const n = data.mediaIds.length;
    const files = n ? ` con ${n} ${n === 1 ? "archivo" : "archivos"}` : "";
    if (!prev) await logActivity(user, data.status === "PUBLISHED" ? "PUBLISH" : "CREATE", "MEMORY", `${data.status === "PUBLISHED" ? "publicó" : "guardó como borrador"} «${data.title}»${files} en ${where}`, id);
    else if (prev.status !== data.status) await logActivity(user, data.status === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH", "MEMORY", `${data.status === "PUBLISHED" ? "publicó" : "pasó a borrador"} «${data.title}» en ${where}`, id);
    else await logActivity(user, "UPDATE", "MEMORY", `editó «${data.title}» en ${where}${files}`, id);
    refresh("/admin/recuerdos");
    return { ok: true, id, message: data.status === "PUBLISHED" ? "Recuerdo publicado." : "Borrador guardado." };
  }) as Promise<ActionResult>;
}

export async function deleteMemory(id: string): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const [row] = await db.delete(schema.memories).where(eq(schema.memories.id, id)).returning();
    if (row) await logActivity(user, "DELETE", "MEMORY", `eliminó «${row.title}»`, null);
    refresh("/admin/recuerdos");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function setMemoryStatus(id: string, status: "DRAFT" | "PUBLISHED"): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const [row] = await db.update(schema.memories).set({ status, updatedById: user.id }).where(eq(schema.memories.id, id)).returning();
    if (row) await logActivity(user, status === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH", "MEMORY", `${status === "PUBLISHED" ? "publicó" : "pasó a borrador"} «${row.title}»`, id);
    refresh("/admin/recuerdos");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function reorderMemories(ids: string[]): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    z.array(z.string()).max(500).parse(ids);
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) await tx.update(schema.memories).set({ order: i }).where(eq(schema.memories.id, ids[i]));
    });
    refresh("/admin/recuerdos");
    return { ok: true };
  }) as Promise<ActionResult>;
}

/** Ordena los recuerdos de un capítulo por fecha (los que no tienen fecha quedan al final). */
export async function sortMemoriesByDate(scene: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const sc = z.enum(SCENES).parse(scene);
    const rows = await db.select({ id: schema.memories.id, date: schema.memories.date, order: schema.memories.order }).from(schema.memories).where(eq(schema.memories.scene, sc));
    rows.sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : a.order - b.order));
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) await tx.update(schema.memories).set({ order: i }).where(eq(schema.memories.id, rows[i].id));
    });
    refresh("/admin/recuerdos");
    return { ok: true, message: "Ordenados por fecha." };
  }) as Promise<ActionResult>;
}

// ——— Biblioteca ———
export async function updateMedia(id: string, data: { caption?: string; alt?: string }): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const parsed = z.object({ caption: optText(200), alt: optText(300) }).parse(data);
    await db.update(schema.media).set(parsed).where(eq(schema.media.id, id));
    refresh("/admin/biblioteca");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const [row] = await db.delete(schema.media).where(eq(schema.media.id, id)).returning();
    if (row) await deleteStoredMedia(row);
    refresh("/admin/biblioteca");
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ——— Línea de tiempo ———
const MilestoneSchema = z.object({
  id: z.string().optional(),
  type: z.enum(MILESTONE_TYPES),
  title: z.string().trim().min(1, "Ponle un título al momento.").max(140),
  description: optText(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha del momento."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  mediaId: z.string().optional().transform((v) => v || null),
  stageId: z.string().optional().transform((v) => v || null),
});

export async function saveMilestone(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const data = MilestoneSchema.parse(Object.fromEntries(["id", "type", "title", "description", "date", "status", "mediaId", "stageId"].map((k) => [k, form.get(k) || undefined])));
    const { id, ...values } = data;
    if (id) await db.update(schema.milestones).set(values).where(eq(schema.milestones.id, id));
    else await db.insert(schema.milestones).values(values);
    await logActivity(user, id ? "UPDATE" : "CREATE", "MILESTONE", `${id ? "editó" : "agregó"} el momento «${values.title}» en la línea de tiempo`, id ?? null);
    refresh("/admin/linea-de-tiempo");
    return { ok: true, message: "Momento guardado." };
  }) as Promise<ActionResult>;
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.delete(schema.milestones).where(eq(schema.milestones.id, id));
    refresh("/admin/linea-de-tiempo");
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ——— Etapas ———
const StageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Ponle nombre a la etapa.").max(60),
  description: optText(400),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color."),
});

export async function saveStage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const data = StageSchema.parse({ id: form.get("id") || undefined, name: form.get("name"), description: form.get("description") ?? undefined, color: form.get("color") });
    const { id, ...values } = data;
    let newId = id;
    if (id) await db.update(schema.stages).set(values).where(eq(schema.stages.id, id));
    else newId = (await db.insert(schema.stages).values({ ...values, order: await db.$count(schema.stages) }).returning({ id: schema.stages.id }))[0].id;
    await logActivity(user, id ? "UPDATE" : "CREATE", "STAGE", `${id ? "editó" : "creó"} la etapa «${values.name}»`, newId);
    refresh("/admin/etapas", "/admin/recuerdos/nuevo");
    return { ok: true, id: newId, message: "Etapa guardada." };
  }) as Promise<ActionResult>;
}

export async function deleteStage(id: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.delete(schema.stages).where(eq(schema.stages.id, id));
    refresh("/admin/etapas");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function reorderStages(ids: string[]): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) await tx.update(schema.stages).set({ order: i }).where(eq(schema.stages.id, ids[i]));
    });
    refresh("/admin/etapas");
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ——— Cartas ———
export async function saveLetterAdmin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const data = z
      .object({
        id: z.string(),
        authorName: z.string().trim().min(1).max(80),
        relation: optText(60),
        body: z.string().trim().min(1, "La carta no puede quedar vacía.").max(8000),
        openAt: dateStr,
        status: z.enum(["DRAFT", "PUBLISHED"]),
      })
      .parse(Object.fromEntries(["id", "authorName", "relation", "body", "openAt", "status"].map((k) => [k, form.get(k) ?? undefined])));
    const { id, ...values } = data;
    await db.update(schema.letters).set({ ...values, openAt: values.openAt ?? null }).where(eq(schema.letters.id, id));
    refresh("/admin/cartas");
    return { ok: true, message: "Carta actualizada." };
  }) as Promise<ActionResult>;
}

export async function deleteLetter(id: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.delete(schema.letters).where(eq(schema.letters.id, id));
    refresh("/admin/cartas");
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ——— Nacimiento ———
export async function saveBirth(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const data = z
      .object({
        birthDate: dateStr,
        birthTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Usa una hora válida.")
          .optional()
          .or(z.literal("").transform(() => undefined)),
        weight: optText(40),
        height: optText(40),
        place: optText(120),
        firstMeeting: optText(2000),
        note: optText(2000),
        mainPhotoId: z.string().optional().transform((v) => v || null),
      })
      .parse(Object.fromEntries(["birthDate", "birthTime", "weight", "height", "place", "firstMeeting", "note", "mainPhotoId"].map((k) => [k, form.get(k) ?? undefined])));
    const values = { ...data, birthDate: data.birthDate ?? null, birthTime: data.birthTime ?? null };
    await db.insert(schema.birthInfo).values({ id: 1, ...values }).onConflictDoUpdate({ target: schema.birthInfo.id, set: values });
    await logActivity(await assertUser("EDITOR"), "UPDATE", "BIRTH", "actualizó los datos del nacimiento");
    refresh("/admin/nacimiento");
    return { ok: true, message: "Datos del nacimiento guardados." };
  }) as Promise<ActionResult>;
}

// ——— Escenas ———
export async function saveScene(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    const data = z
      .object({
        scene: z.enum(SCENES),
        title: z.string().trim().min(1, "El capítulo necesita un título.").max(80),
        subtitle: optText(60),
        phrase: optText(240),
        enabled: z.boolean(),
      })
      .parse({ scene: form.get("scene"), title: form.get("title"), subtitle: form.get("subtitle") ?? undefined, phrase: form.get("phrase") ?? undefined, enabled: form.get("enabled") === "on" });
    const { scene, ...values } = data;
    await db.insert(schema.sceneConfigs).values({ scene, ...values }).onConflictDoUpdate({ target: schema.sceneConfigs.scene, set: values });
    await logActivity(await assertUser("EDITOR"), "UPDATE", "CHAPTER", `editó el capítulo «${values.title}»`, scene);
    refresh("/admin/escenas");
    return { ok: true, message: "Capítulo guardado." };
  }) as Promise<ActionResult>;
}

// ——— Personas con acceso (sólo administradores) ———
/** El dueño oculto sólo lo puede tocar él mismo: para los demás, no existe. */
async function assertNotHiddenOwner(me: { isOwner?: boolean }, id: string) {
  if (me.isOwner) return;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { isOwner: true } });
  if (!u || u.isOwner) throw new AuthError(403, "Esa persona ya no existe.");
}
const ROLES = Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>;

export async function createUser(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
    const data = z
      .object({
        name: z.string().trim().min(1, "Escribe el nombre.").max(80),
        email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
        relation: optText(60),
        role: z.enum(ROLES as [string, ...string[]]),
        password: z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(200).optional().or(z.literal("").transform(() => undefined)),
      })
      .parse(Object.fromEntries(["name", "email", "relation", "role", "password"].map((k) => [k, form.get(k) ?? undefined])));
    const exists = await db.query.users.findFirst({ where: eq(schema.users.email, data.email) });
    if (exists) return { ok: false, error: "Ya existe una persona con ese correo." };
    const [row] = await db
      .insert(schema.users)
      .values({
        name: data.name,
        email: data.email,
        relation: data.relation,
        role: data.role as (typeof ROLES)[number],
        passwordHash: data.password ? await hashPassword(data.password) : null,
      })
      .returning({ id: schema.users.id });
    await logActivity(me, "INVITE", "USER", `dio acceso a ${data.name}${data.relation ? ` (${data.relation})` : ""}`, row.id);
    refresh("/admin/usuarios");
    if (!data.password) {
      const link = await issueInvite(row.id);
      return { ok: true, id: row.id, message: link };
    }
    return { ok: true, id: row.id, message: `${data.name} ya puede entrar.` };
  }) as Promise<ActionResult>;
}

export async function updateUser(id: string, data: { role?: string; active?: boolean; relation?: string; name?: string }): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
    await assertNotHiddenOwner(me, id);
    if (id === me.id && (data.role && data.role !== "ADMIN" || data.active === false)) {
      return { ok: false, error: "No puedes quitarte a ti mismo el rol de administrador ni desactivarte." };
    }
    const parsed = z
      .object({ role: z.enum(ROLES as [string, ...string[]]).optional(), active: z.boolean().optional(), relation: optText(60), name: z.string().trim().min(1).max(80).optional() })
      .parse(data);
    const values: Partial<typeof schema.users.$inferInsert> = {};
    if (parsed.role) values.role = parsed.role as (typeof ROLES)[number];
    if (parsed.active !== undefined) values.active = parsed.active;
    if (data.relation !== undefined) values.relation = parsed.relation;
    if (parsed.name) values.name = parsed.name;
    await db.update(schema.users).set(values).where(eq(schema.users.id, id));
    if (parsed.active === false) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    refresh("/admin/usuarios");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function resetUserPassword(id: string, password: string): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
    await assertNotHiddenOwner(me, id);
    z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(200).parse(password);
    await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    return { ok: true, message: "Clave cambiada. Comparte la nueva clave en persona o por un canal seguro." };
  }) as Promise<ActionResult>;
}

export async function deleteUser(id: string): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
    await assertNotHiddenOwner(me, id);
    if (id === me.id) return { ok: false, error: "No puedes eliminar tu propia cuenta." };
    const admins = await db.$count(schema.users, and(eq(schema.users.role, "ADMIN"), ne(schema.users.id, id)));
    if (admins === 0) return { ok: false, error: "Debe quedar al menos un administrador." };
    await db.delete(schema.users).where(eq(schema.users.id, id));
    refresh("/admin/usuarios");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function changeOwnPassword(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("FAMILY");
    const data = z
      .object({ current: z.string().min(1, "Escribe tu clave actual."), next: z.string().min(8, "La nueva clave debe tener al menos 8 caracteres.").max(200) })
      .parse({ current: form.get("current"), next: form.get("next") });
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
    if (!row || !row.passwordHash || !(await verifyPassword(data.current, row.passwordHash))) return { ok: false, error: "La clave actual no coincide." };
    await db.update(schema.users).set({ passwordHash: await hashPassword(data.next) }).where(eq(schema.users.id, me.id));
    return { ok: true, message: "Tu clave quedó actualizada." };
  }) as Promise<ActionResult>;
}

// utilidad para la biblioteca: ¿en qué recuerdos se usa?
export async function mediaUsage(ids: string[]) {
  await assertUser("EDITOR");
  if (!ids.length) return {};
  const rows = await db.select({ mediaId: schema.memoryMedia.mediaId }).from(schema.memoryMedia).where(inArray(schema.memoryMedia.mediaId, ids));
  const out: Record<string, number> = {};
  for (const r of rows) out[r.mediaId] = (out[r.mediaId] ?? 0) + 1;
  return out;
}

// ——— Invitaciones: la persona elige su propia clave ———
const INVITE_DAYS = 14;
async function issueInvite(userId: string) {
  const token = randomBytes(24).toString("base64url");
  await db
    .update(schema.users)
    .set({ inviteTokenHash: sha256(token), inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 864e5) })
    .where(eq(schema.users.id, userId));
  return `${await siteOrigin()}/invitacion/${token}`;
}

/** Crea (o renueva) el enlace para que alguien entre por primera vez o cambie su clave olvidada. */
export async function createInviteLink(userId: string): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
    await assertNotHiddenOwner(me, userId);
    const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!u) return { ok: false, error: "Esa persona ya no existe." };
    const link = await issueInvite(userId);
    await logActivity(me, "INVITE", "USER", `creó un enlace de invitación para ${u.name}`, userId);
    refresh("/admin/usuarios");
    return { ok: true, message: link };
  }) as Promise<ActionResult>;
}

// ——— Capítulos creados por la familia ———
const COMPANIONS = ["stego", "trice", "ptero", "baby"] as const;
const ChapterSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Ponle un título al capítulo.").max(80),
  subtitle: optText(60),
  phrase: optText(240),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color."),
  companion: z.enum(COMPANIONS),
  afterScene: z.enum(SCENES),
  enabled: z.boolean(),
});

export async function saveChapter(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const data = ChapterSchema.parse({
      id: form.get("id") || undefined,
      title: form.get("title"),
      subtitle: form.get("subtitle") ?? undefined,
      phrase: form.get("phrase") ?? undefined,
      color: form.get("color") || "#9B7BE0",
      companion: form.get("companion") || "stego",
      afterScene: form.get("afterScene") || "AVENTURAS",
      enabled: form.has("hasEnabled") ? form.get("enabled") === "on" : true,
    });
    const { id, ...values } = data;
    let newId = id;
    if (id) {
      await db.update(schema.chapters).set(values).where(eq(schema.chapters.id, id));
      await db.update(schema.memories).set({ scene: values.afterScene }).where(eq(schema.memories.chapterId, id));
    } else {
      const count = await db.$count(schema.chapters, eq(schema.chapters.afterScene, values.afterScene));
      newId = (await db.insert(schema.chapters).values({ ...values, order: count, createdById: user.id }).returning({ id: schema.chapters.id }))[0].id;
    }
    await logActivity(user, id ? "UPDATE" : "CREATE", "CHAPTER", `${id ? "editó" : "creó"} el capítulo «${values.title}»`, newId);
    refresh("/admin/escenas", "/admin/recuerdos/nuevo");
    return { ok: true, id: newId, message: id ? "Capítulo guardado." : "Capítulo creado." };
  }) as Promise<ActionResult>;
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("EDITOR");
    const [row] = await db.delete(schema.chapters).where(eq(schema.chapters.id, id)).returning();
    if (row) await logActivity(user, "DELETE", "CHAPTER", `eliminó el capítulo «${row.title}» (sus recuerdos pasaron a «${SCENE_META[row.afterScene].title}»)`);
    refresh("/admin/escenas");
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ——— Enlaces para compartir sin cuenta ———
export async function createShareLink(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("ADMIN");
    const data = z
      .object({ label: z.string().trim().min(1, "Escribe para quién es el enlace.").max(80), days: z.coerce.number().int().min(0).max(3650) })
      .parse({ label: form.get("label"), days: form.get("days") || 0 });
    const token = randomBytes(24).toString("base64url");
    await db.insert(schema.shareLinks).values({
      tokenHash: sha256(token),
      label: data.label,
      createdById: user.id,
      expiresAt: data.days ? new Date(Date.now() + data.days * 864e5) : null,
    });
    await logActivity(user, "SHARE", "SHARE", `creó un enlace para compartir el álbum con «${data.label}»`);
    refresh("/admin/compartir");
    return { ok: true, message: `${await siteOrigin()}/ver/${token}` };
  }) as Promise<ActionResult>;
}

export async function revokeShareLink(id: string): Promise<ActionResult> {
  return guard(async () => {
    const user = await assertUser("ADMIN");
    const [row] = await db.update(schema.shareLinks).set({ revokedAt: new Date() }).where(eq(schema.shareLinks.id, id)).returning();
    if (row) await logActivity(user, "SHARE", "SHARE", `desactivó el enlace de «${row.label}»`);
    refresh("/admin/compartir");
    return { ok: true };
  }) as Promise<ActionResult>;
}
