ALTER TYPE "presentation" ADD VALUE IF NOT EXISTS 'SCRAPBOOK';--> statement-breakpoint
ALTER TYPE "presentation" ADD VALUE IF NOT EXISTS 'CAROUSEL';--> statement-breakpoint
ALTER TYPE "presentation" ADD VALUE IF NOT EXISTS 'DECK';--> statement-breakpoint
ALTER TYPE "presentation" ADD VALUE IF NOT EXISTS 'STORYBOOK';--> statement-breakpoint
ALTER TYPE "presentation" ADD VALUE IF NOT EXISTS 'BUBBLES';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chapters" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "phrase" text,
  "color" text DEFAULT '#9B7BE0' NOT NULL,
  "companion" text DEFAULT 'stego' NOT NULL,
  "after_scene" "scene" DEFAULT 'AVENTURAS' NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "chapter_id" text REFERENCES "chapters"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "updated_by_id" text REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "user_name" text NOT NULL,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text,
  "summary" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_created_idx" ON "activity" ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "share_links" (
  "id" text PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "uses" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "relation", "active")
VALUES (gen_random_uuid()::text, 'Leidy', 'leidy@joaquin.familia', NULL, 'ADMIN', 'Mamá', true),
       (gen_random_uuid()::text, 'Hernán', 'hernan@joaquin.familia', NULL, 'ADMIN', 'Papá', true)
ON CONFLICT ("email") DO NOTHING;
