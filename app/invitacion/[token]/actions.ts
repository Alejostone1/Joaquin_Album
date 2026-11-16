"use server";

import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { db, schema } from "@/lib/db";

export type InviteState = { error?: string };
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function acceptInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const parsed = z
    .object({
      token: z.string().min(20).max(80),
      password: z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(200),
      confirm: z.string(),
    })
    .safeParse({ token: form.get("token"), password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Las dos claves no coinciden." };
  const user = await db.query.users.findFirst({
    where: and(eq(schema.users.inviteTokenHash, sha256(parsed.data.token)), gt(schema.users.inviteExpiresAt, new Date())),
  });
  if (!user) return { error: "Este enlace ya se usó o venció. Pide uno nuevo." };
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(parsed.data.password), inviteTokenHash: null, inviteExpiresAt: null, active: true })
    .where(eq(schema.users.id, user.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  await createSession(user.id);
  await logActivity(user, "JOIN", "USER", "entró al álbum por primera vez", user.id);
  redirect("/historia");
}
