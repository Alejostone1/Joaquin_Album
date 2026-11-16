import "server-only";
import { db, schema } from "@/lib/db";

export type ActivityAction = "CREATE" | "UPDATE" | "PUBLISH" | "UNPUBLISH" | "DELETE" | "UPLOAD" | "SHARE" | "INVITE" | "JOIN";
export type ActivityEntity = "MEMORY" | "MEDIA" | "MILESTONE" | "STAGE" | "CHAPTER" | "LETTER" | "BIRTH" | "USER" | "SHARE";

/** Deja constancia de quién hizo qué. Nunca interrumpe la acción si falla. */
export async function logActivity(
  user: { id: string; name: string },
  action: ActivityAction,
  entity: ActivityEntity,
  summary: string,
  entityId?: string | null,
) {
  try {
    await db.insert(schema.activity).values({ userId: user.id, userName: user.name, action, entity, entityId: entityId ?? null, summary: summary.slice(0, 300) });
  } catch (e) {
    console.error("activity", (e as Error).message);
  }
}
