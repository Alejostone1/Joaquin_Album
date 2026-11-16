import { asc, sql } from "drizzle-orm";
import { CustomChapterManager, SceneManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { SCENE_META, SCENES } from "@/lib/constants";
import { db, schema } from "@/lib/db";

export default async function EscenasPage() {
  await requireUser("EDITOR");
  const [rows, custom, counts] = await Promise.all([
    db.select().from(schema.sceneConfigs),
    db.select().from(schema.chapters).orderBy(asc(schema.chapters.order), asc(schema.chapters.createdAt)),
    db.select({ id: schema.memories.chapterId, n: sql<number>`count(*)::int` }).from(schema.memories).groupBy(schema.memories.chapterId),
  ]);
  const list = SCENES.map((s) => {
    const r = rows.find((x) => x.scene === s);
    return { scene: s, title: r?.title ?? SCENE_META[s].title, subtitle: r?.subtitle ?? SCENE_META[s].chapter, phrase: r?.phrase ?? SCENE_META[s].phrase, enabled: r?.enabled ?? true };
  });
  const n = new Map(counts.map((c) => [c.id, c.n]));
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <PageTitle title="Capítulos" kicker="Crea capítulos nuevos y cambia títulos y frases" color="#2F5D47" />
        <CustomChapterManager rows={custom.map((c) => ({ id: c.id, title: c.title, subtitle: c.subtitle, phrase: c.phrase, color: c.color, companion: c.companion, afterScene: c.afterScene, enabled: c.enabled, count: n.get(c.id) ?? 0 }))} />
      </div>
      <div>
        <h2 className="mb-4 font-heading text-3xl font-extrabold">Los siete capítulos de la historia</h2>
        <SceneManager rows={list} />
      </div>
    </div>
  );
}
