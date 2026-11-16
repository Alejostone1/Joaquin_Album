import { and, desc, isNull, notInArray, or } from "drizzle-orm";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { PageTitle } from "@/components/admin/ui";
import { getOwnerIds, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function HistorialPage() {
  const me = await requireUser("EDITOR");
  const owners = me.isOwner ? [] : await getOwnerIds();
  const rows = await db
    .select()
    .from(schema.activity)
    .where(owners.length ? and(or(isNull(schema.activity.userId), notInArray(schema.activity.userId, owners))) : undefined)
    .orderBy(desc(schema.activity.createdAt))
    .limit(400);
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Historial" kicker="Quién publicó qué y cuándo" color="#E86A9A" />
      <ActivityFeed rows={rows.map((r) => ({ id: r.id, userName: r.userName, action: r.action, entity: r.entity, entityId: r.entityId, summary: r.summary, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}
