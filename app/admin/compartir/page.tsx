import { desc } from "drizzle-orm";
import { ShareManager } from "@/components/admin/ShareManager";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function CompartirPage() {
  await requireUser("ADMIN");
  const rows = await db.select().from(schema.shareLinks).orderBy(desc(schema.shareLinks.createdAt));
  const now = new Date();
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Compartir el álbum" kicker="Enlaces para ver sin cuenta" color="#1FB5B0" />
      <ShareManager
        rows={rows.map((r) => ({
          id: r.id,
          label: r.label,
          uses: r.uses,
          createdAt: r.createdAt.toISOString(),
          lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
          expiresAt: r.expiresAt?.toISOString() ?? null,
          active: !r.revokedAt && (!r.expiresAt || r.expiresAt > now),
        }))}
      />
    </div>
  );
}
