import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MemoryForm } from "@/components/admin/MemoryForm";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary, loadStages } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function EditarRecuerdo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  await requireUser("EDITOR");
  const { id } = await params;
  const { guardado } = await searchParams;
  const [memory, library, stages] = await Promise.all([
    db.query.memories.findFirst({ where: eq(schema.memories.id, id), with: { media: { orderBy: [asc(schema.memoryMedia.order)] } } }),
    loadLibrary(),
    loadStages(),
  ]);
  if (!memory) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Editar recuerdo" kicker="Recuerdos" color="#FF8A7A" />
      <MemoryForm
        key={memory.id}
        justSaved={guardado === "1"}
        library={library}
        stages={stages}
        initial={{
          id: memory.id,
          title: memory.title,
          description: memory.description ?? "",
          date: memory.date ?? "",
          scene: memory.scene,
          presentation: memory.presentation,
          stageId: memory.stageId ?? "",
          tags: memory.tags.join(", "),
          status: memory.status,
          mediaIds: memory.media.map((m) => m.mediaId),
          coverId: memory.coverId ?? "",
        }}
      />
    </div>
  );
}
