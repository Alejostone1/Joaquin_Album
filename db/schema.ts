// Joaquín — Mi pequeño universo
// Modelo de datos familiar privado (Drizzle ORM + PostgreSQL).

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** ADMIN: todo, incluidos usuarios · EDITOR: contenido · FAMILY: ver y escribir cartas */
export const roleEnum = pgEnum("role", ["ADMIN", "EDITOR", "FAMILY"]);
export const mediaKindEnum = pgEnum("media_kind", ["IMAGE", "VIDEO"]);
export const statusEnum = pgEnum("status", ["DRAFT", "PUBLISHED"]);
export const sceneEnum = pgEnum("scene", [
  "ANTES",
  "LLEGADA",
  "PRIMEROS_DIAS",
  "CRECIENDO",
  "FAMILIA",
  "AVENTURAS",
  "CARTAS",
]);
export const presentationEnum = pgEnum("presentation", [
  "AUTO",
  "CINEMATIC",
  "PARALLAX",
  "ZOOM",
  "EDITORIAL",
  "OVERLAP",
  "COLLAGE",
  "SEQUENCE",
  "REVEAL",
  "MASK",
  "SCRAPBOOK",
  "CAROUSEL",
  "DECK",
  "STORYBOOK",
  "BUBBLES",
]);
export const milestoneTypeEnum = pgEnum("milestone_type", [
  "MES",
  "CUMPLEANOS",
  "PALABRA",
  "PASOS",
  "VIAJE",
  "JUEGO",
  "DESCUBRIMIENTO",
  "ESPECIAL",
]);

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  /** null mientras la persona no haya aceptado su invitación */
  passwordHash: text("password_hash"),
  inviteTokenHash: text("invite_token_hash"),
  inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
  role: roleEnum("role").notNull().default("FAMILY"),
  /** dueño del álbum: acceso total e invisible para los demás (no aparece en personas, historial ni autorías) */
  isOwner: boolean("is_owner").notNull().default(false),
  relation: text("relation"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** El id es el sha256 del token; el token en claro sólo vive en la cookie httpOnly. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const media = pgTable("media", {
  id: id(),
  kind: mediaKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  /** ruta del original cuando no sigue el patrón <storageKey>/original (subidas directas a Blob) */
  originalPath: text("original_path"),
  mimeType: text("mime_type").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  blurDataUrl: text("blur_data_url"),
  caption: text("caption"),
  alt: text("alt"),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const stages = pgTable("stages", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#A8C3A0"),
  order: integer("order").notNull().default(0),
  createdAt: createdAt(),
});

/** Capítulos creados por la familia (además de los siete de la historia). */
export const chapters = pgTable("chapters", {
  id: id(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  phrase: text("phrase"),
  color: text("color").notNull().default("#9B7BE0"),
  companion: text("companion").notNull().default("stego"),
  /** aparece justo después de este capítulo de la historia */
  afterScene: sceneEnum("after_scene").notNull().default("AVENTURAS"),
  order: integer("order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const memories = pgTable(
  "memories",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description"),
    date: text("date"), // "2026-11-15" — texto para no alterar zonas horarias
    scene: sceneEnum("scene").notNull().default("PRIMEROS_DIAS"),
    presentation: presentationEnum("presentation").notNull().default("AUTO"),
    tags: text("tags").array().notNull().default([]),
    status: statusEnum("status").notNull().default("DRAFT"),
    order: integer("order").notNull().default(0),
    stageId: text("stage_id").references(() => stages.id, { onDelete: "set null" }),
    coverId: text("cover_id").references(() => media.id, { onDelete: "set null" }),
    chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    updatedById: text("updated_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("memories_scene_idx").on(t.scene, t.status, t.order)],
);

export const memoryMedia = pgTable(
  "memory_media",
  {
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.memoryId, t.mediaId] })],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    type: milestoneTypeEnum("type").notNull().default("ESPECIAL"),
    title: text("title").notNull(),
    description: text("description"),
    date: text("date").notNull(),
    status: statusEnum("status").notNull().default("PUBLISHED"),
    mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
    stageId: text("stage_id").references(() => stages.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("milestones_date_idx").on(t.date)],
);

export const letters = pgTable("letters", {
  id: id(),
  authorName: text("author_name").notNull(),
  relation: text("relation"),
  body: text("body").notNull(),
  openAt: text("open_at"), // si existe, la carta queda sellada hasta esa fecha
  status: statusEnum("status").notNull().default("PUBLISHED"),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Datos del nacimiento: fila única, todos opcionales. Nunca se inventan. */
export const birthInfo = pgTable("birth_info", {
  id: integer("id").primaryKey().default(1),
  birthDate: text("birth_date"),
  birthTime: text("birth_time"),
  weight: text("weight"),
  height: text("height"),
  place: text("place"),
  firstMeeting: text("first_meeting"),
  note: text("note"),
  mainPhotoId: text("main_photo_id").references(() => media.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const sceneConfigs = pgTable("scene_configs", {
  scene: sceneEnum("scene").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  phrase: text("phrase"),
  enabled: boolean("enabled").notNull().default(true),
});

/** Historial: quién hizo qué y cuándo. */
export const activity = pgTable(
  "activity",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);

/** Enlaces para ver el álbum sin cuenta (sólo lectura, revocables). */
export const shareLinks = pgTable("share_links", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull(),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  uses: integer("uses").notNull().default(0),
  createdAt: createdAt(),
});

// ——— Relaciones (API de consultas) ———
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  letters: many(letters),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const mediaRelations = relations(media, ({ many }) => ({
  memoryLinks: many(memoryMedia),
}));
export const stagesRelations = relations(stages, ({ many }) => ({
  memories: many(memories),
  milestones: many(milestones),
}));
export const memoriesRelations = relations(memories, ({ one, many }) => ({
  stage: one(stages, { fields: [memories.stageId], references: [stages.id] }),
  chapter: one(chapters, { fields: [memories.chapterId], references: [chapters.id] }),
  author: one(users, { fields: [memories.createdById], references: [users.id], relationName: "memoryAuthor" }),
  editor: one(users, { fields: [memories.updatedById], references: [users.id], relationName: "memoryEditor" }),
  cover: one(media, { fields: [memories.coverId], references: [media.id] }),
  media: many(memoryMedia),
}));
export const memoryMediaRelations = relations(memoryMedia, ({ one }) => ({
  memory: one(memories, { fields: [memoryMedia.memoryId], references: [memories.id] }),
  media: one(media, { fields: [memoryMedia.mediaId], references: [media.id] }),
}));
export const milestonesRelations = relations(milestones, ({ one }) => ({
  media: one(media, { fields: [milestones.mediaId], references: [media.id] }),
  stage: one(stages, { fields: [milestones.stageId], references: [stages.id] }),
}));
export const lettersRelations = relations(letters, ({ one }) => ({
  author: one(users, { fields: [letters.authorId], references: [users.id] }),
}));
export const birthInfoRelations = relations(birthInfo, ({ one }) => ({
  mainPhoto: one(media, { fields: [birthInfo.mainPhotoId], references: [media.id] }),
}));

export type User = typeof users.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Letter = typeof letters.$inferSelect;
export type BirthInfo = typeof birthInfo.$inferSelect;
export type SceneConfig = typeof sceneConfigs.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type SceneKey = (typeof sceneEnum.enumValues)[number];
export type PresentationKey = (typeof presentationEnum.enumValues)[number];
export type MilestoneType = (typeof milestoneTypeEnum.enumValues)[number];
