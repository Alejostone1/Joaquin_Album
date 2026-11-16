import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema } from "@/lib/db";

export const GUEST_COOKIE = "jq_guest";
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Busca un enlace de invitado vigente por su token en claro. */
export async function findShareLink(token: string) {
  if (!token || token.length < 20 || token.length > 80) return null;
  const rows = await db
    .select()
    .from(schema.shareLinks)
    .where(
      and(
        eq(schema.shareLinks.tokenHash, sha256(token)),
        isNull(schema.shareLinks.revokedAt),
        or(isNull(schema.shareLinks.expiresAt), gt(schema.shareLinks.expiresAt, new Date())),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function markShareUse(id: string) {
  await db
    .update(schema.shareLinks)
    .set({ uses: sql`${schema.shareLinks.uses} + 1`, lastUsedAt: new Date() })
    .where(eq(schema.shareLinks.id, id));
}

/** Invitado con enlace (sin cuenta), memorizado por petición. */
export const getGuest = cache(async () => {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!token) return null;
  const link = await findShareLink(token);
  return link ? { id: link.id, label: link.label } : null;
});
