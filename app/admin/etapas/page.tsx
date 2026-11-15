import { StageManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { loadStages } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";

export default async function EtapasPage() {
  await requireUser("EDITOR");
  const stages = await loadStages();
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Etapas" kicker="Para clasificar los recuerdos" color="#3C9BE0" />
      <StageManager rows={stages.map((s) => ({ id: s.id, name: s.name, description: s.description, color: s.color }))} />
    </div>
  );
}
