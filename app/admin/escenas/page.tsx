import { SceneManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { SCENE_META, SCENES } from "@/lib/constants";
import { db, schema } from "@/lib/db";

export default async function EscenasPage() {
  await requireUser("EDITOR");
  const rows = await db.select().from(schema.sceneConfigs);
  const list = SCENES.map((s) => {
    const r = rows.find((x) => x.scene === s);
    return { scene: s, title: r?.title ?? SCENE_META[s].title, subtitle: r?.subtitle ?? SCENE_META[s].chapter, phrase: r?.phrase ?? SCENE_META[s].phrase, enabled: r?.enabled ?? true };
  });
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Capítulos" kicker="Títulos y frases de la historia" color="#2F5D47" />
      <SceneManager rows={list} />
    </div>
  );
}
