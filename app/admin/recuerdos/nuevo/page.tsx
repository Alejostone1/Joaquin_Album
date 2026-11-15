import { MemoryForm } from "@/components/admin/MemoryForm";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary, loadStages } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { SCENES, type SceneId } from "@/lib/constants";

export default async function NuevoRecuerdo({ searchParams }: { searchParams: Promise<{ capitulo?: string }> }) {
  await requireUser("EDITOR");
  const [{ capitulo }, library, stages] = await Promise.all([searchParams, loadLibrary(), loadStages()]);
  const scene = (SCENES as readonly string[]).includes(capitulo ?? "") && capitulo !== "CARTAS" ? (capitulo as SceneId) : "PRIMEROS_DIAS";
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Nuevo recuerdo" kicker="Recuerdos" color="#FF8A7A" />
      <MemoryForm
        library={library}
        stages={stages}
        initial={{ title: "", description: "", date: "", scene, presentation: "AUTO", stageId: "", tags: "", status: "DRAFT", mediaIds: [], coverId: "" }}
      />
    </div>
  );
}
