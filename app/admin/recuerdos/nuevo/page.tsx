import { MemoryForm } from "@/components/admin/MemoryForm";
import { PageTitle } from "@/components/admin/ui";
import { loadChapterOptions, loadLibrary, loadStages } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";

export default async function NuevoRecuerdo({ searchParams }: { searchParams: Promise<{ capitulo?: string }> }) {
  await requireUser("EDITOR");
  const [{ capitulo }, library, stages, chapters] = await Promise.all([searchParams, loadLibrary(), loadStages(), loadChapterOptions()]);
  // sin capítulo por defecto: la persona lo elige (evita que el recuerdo quede donde no esperaba)
  const scene = chapters.some((c) => c.target === capitulo) ? capitulo! : "";
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Nuevo recuerdo" kicker="Recuerdos" color="#FF8A7A" />
      <MemoryForm
        library={library}
        stages={stages}
        chapters={chapters}
        initial={{ title: "", description: "", date: "", scene, presentation: "AUTO", stageId: "", tags: "", status: "DRAFT", mediaIds: [], coverId: "" }}
      />
    </div>
  );
}
