ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users" SET "is_owner" = true WHERE "email" = 'alejandro@joaquin.familia';
