import { asc } from "drizzle-orm";
import { MilestoneManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary, loadStages } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function LineaPage() {
  await requireUser("EDITOR");
  const [rows, library, stages] = await Promise.all([db.select().from(schema.milestones).orderBy(asc(schema.milestones.date)), loadLibrary(), loadStages()]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Línea de tiempo" kicker="Así voy creciendo" color="#F2A516" />
      <MilestoneManager
        rows={rows.map((r) => ({ id: r.id, type: r.type, title: r.title, description: r.description, date: r.date, status: r.status, mediaId: r.mediaId, stageId: r.stageId }))}
        library={library}
        stages={stages.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
