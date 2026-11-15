CREATE TYPE "media_kind" AS ENUM('IMAGE', 'VIDEO');--> statement-breakpoint
CREATE TYPE "milestone_type" AS ENUM('MES', 'CUMPLEANOS', 'PALABRA', 'PASOS', 'VIAJE', 'JUEGO', 'DESCUBRIMIENTO', 'ESPECIAL');--> statement-breakpoint
CREATE TYPE "presentation" AS ENUM('AUTO', 'CINEMATIC', 'PARALLAX', 'ZOOM', 'EDITORIAL', 'OVERLAP', 'COLLAGE', 'SEQUENCE', 'REVEAL', 'MASK');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('ADMIN', 'EDITOR', 'FAMILY');--> statement-breakpoint
CREATE TYPE "scene" AS ENUM('ANTES', 'LLEGADA', 'PRIMEROS_DIAS', 'CRECIENDO', 'FAMILIA', 'AVENTURAS', 'CARTAS');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "birth_info" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"birth_date" text,
	"birth_time" text,
	"weight" text,
	"height" text,
	"place" text,
	"first_meeting" text,
	"note" text,
	"main_photo_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letters" (
	"id" text PRIMARY KEY NOT NULL,
	"author_name" text NOT NULL,
	"relation" text,
	"body" text NOT NULL,
	"open_at" text,
	"status" "status" DEFAULT 'PUBLISHED' NOT NULL,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"original_name" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"caption" text,
	"alt" text,
	"taken_at" timestamp with time zone,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" text,
	"scene" "scene" DEFAULT 'PRIMEROS_DIAS' NOT NULL,
	"presentation" "presentation" DEFAULT 'AUTO' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" "status" DEFAULT 'DRAFT' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"stage_id" text,
	"cover_id" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_media" (
	"memory_id" text NOT NULL,
	"media_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "memory_media_memory_id_media_id_pk" PRIMARY KEY("memory_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "milestone_type" DEFAULT 'ESPECIAL' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" text NOT NULL,
	"status" "status" DEFAULT 'PUBLISHED' NOT NULL,
	"media_id" text,
	"stage_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_configs" (
	"scene" "scene" PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"phrase" text,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#A8C3A0' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'FAMILY' NOT NULL,
	"relation" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "birth_info" ADD CONSTRAINT "birth_info_main_photo_id_media_id_fk" FOREIGN KEY ("main_photo_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_scene_idx" ON "memories" USING btree ("scene","status","order");--> statement-breakpoint
CREATE INDEX "milestones_date_idx" ON "milestones" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");