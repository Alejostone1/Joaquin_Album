"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser, hashPassword, verifyPassword } from "@/lib/auth";
import { MILESTONE_TYPES, PRESENTATIONS, ROLE_LABELS, SCENES } from "@/lib/constants";
import { db, schema } from "@/lib/db";
import { deleteStoredMedia } from "@/lib/storage";

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
const MemorySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Ponle un título al recuerdo.").max(140),
  description: optText(4000),
  date: dateStr,
  scene: z.enum(SCENES),
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
      scene: form.get("scene"),
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
    const values = {
      title: data.title,
      description: data.description,
      date: data.date ?? null,
      scene: data.scene,
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
        const count = await tx.$count(schema.memories, eq(schema.memories.scene, data.scene));
        const [row] = await tx.insert(schema.memories).values({ ...values, order: count, createdById: user.id }).returning({ id: schema.memories.id });
        memoryId = row.id;
      }
      if (data.mediaIds.length) {
        await tx.insert(schema.memoryMedia).values(data.mediaIds.map((mediaId, order) => ({ memoryId: memoryId!, mediaId, order })));
      }
      return memoryId!;
    });
    refresh("/admin/recuerdos");
    return { ok: true, id, message: data.status === "PUBLISHED" ? "Recuerdo publicado." : "Borrador guardado." };
  }) as Promise<ActionResult>;
}

export async function deleteMemory(id: string): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.delete(schema.memories).where(eq(schema.memories.id, id));
    refresh("/admin/recuerdos");
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function setMemoryStatus(id: string, status: "DRAFT" | "PUBLISHED"): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("EDITOR");
    await db.update(schema.memories).set({ status }).where(eq(schema.memories.id, id));
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
    await assertUser("EDITOR");
    const data = MilestoneSchema.parse(Object.fromEntries(["id", "type", "title", "description", "date", "status", "mediaId", "stageId"].map((k) => [k, form.get(k) || undefined])));
    const { id, ...values } = data;
    if (id) await db.update(schema.milestones).set(values).where(eq(schema.milestones.id, id));
    else await db.insert(schema.milestones).values(values);
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
    await assertUser("EDITOR");
    const data = StageSchema.parse({ id: form.get("id") || undefined, name: form.get("name"), description: form.get("description") ?? undefined, color: form.get("color") });
    const { id, ...values } = data;
    if (id) await db.update(schema.stages).set(values).where(eq(schema.stages.id, id));
    else await db.insert(schema.stages).values({ ...values, order: await db.$count(schema.stages) });
    refresh("/admin/etapas");
    return { ok: true, message: "Etapa guardada." };
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
    refresh("/admin/escenas");
    return { ok: true, message: "Capítulo guardado." };
  }) as Promise<ActionResult>;
}

// ——— Personas con acceso (sólo administradores) ———
const ROLES = Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>;

export async function createUser(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guard(async () => {
    await assertUser("ADMIN");
    const data = z
      .object({
        name: z.string().trim().min(1, "Escribe el nombre.").max(80),
        email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
        relation: optText(60),
        role: z.enum(ROLES as [string, ...string[]]),
        password: z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(200),
      })
      .parse(Object.fromEntries(["name", "email", "relation", "role", "password"].map((k) => [k, form.get(k) ?? undefined])));
    const exists = await db.query.users.findFirst({ where: eq(schema.users.email, data.email) });
    if (exists) return { ok: false, error: "Ya existe una persona con ese correo." };
    await db.insert(schema.users).values({
      name: data.name,
      email: data.email,
      relation: data.relation,
      role: data.role as (typeof ROLES)[number],
      passwordHash: await hashPassword(data.password),
    });
    refresh("/admin/usuarios");
    return { ok: true, message: `${data.name} ya puede entrar.` };
  }) as Promise<ActionResult>;
}

export async function updateUser(id: string, data: { role?: string; active?: boolean; relation?: string; name?: string }): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
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
    await assertUser("ADMIN");
    z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(200).parse(password);
    await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    return { ok: true, message: "Clave cambiada. Comparte la nueva clave en persona o por un canal seguro." };
  }) as Promise<ActionResult>;
}

export async function deleteUser(id: string): Promise<ActionResult> {
  return guard(async () => {
    const me = await assertUser("ADMIN");
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
    if (!row || !(await verifyPassword(data.current, row.passwordHash))) return { ok: false, error: "La clave actual no coincide." };
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
