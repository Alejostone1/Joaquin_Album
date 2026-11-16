import { asc } from "drizzle-orm";
import Link from "next/link";
import { MemoryBoard } from "@/components/admin/MemoryBoard";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { toMediaDTO } from "@/lib/story";

export default async function RecuerdosPage() {
  const me = await requireUser("EDITOR");
  const rows = await db.query.memories.findMany({
    orderBy: [asc(schema.memories.order), asc(schema.memories.createdAt)],
    with: { cover: true, media: true, chapter: { columns: { title: true, color: true } }, author: { columns: { name: true, isOwner: true } } },
  });
  const items = rows.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    scene: m.scene,
    status: m.status,
    presentation: m.presentation,
    cover: m.cover ? toMediaDTO(m.cover) : null,
    count: m.media.length,
    chapter: m.chapter ? { title: m.chapter.title, color: m.chapter.color } : null,
    author: m.author && (!m.author.isOwner || me.isOwner) ? m.author.name : null,
  }));
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Recuerdos" kicker="Las escenas de su historia" color="#FF8A7A">
        <Link href="/historia?preview=1" target="_blank" className="btn-soft">
          Vista previa con borradores
        </Link>
        <Link href="/admin/recuerdos/nuevo" className="btn-candy">
          Nuevo recuerdo
        </Link>
      </PageTitle>
      <MemoryBoard items={items} />
    </div>
  );
}
