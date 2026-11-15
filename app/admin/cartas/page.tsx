import { desc } from "drizzle-orm";
import Link from "next/link";
import { LetterManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function CartasPage() {
  await requireUser("EDITOR");
  const rows = await db.select().from(schema.letters).orderBy(desc(schema.letters.createdAt));
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Cartas" kicker="Para su futuro" color="#FF9F68">
        <Link href="/historia#cartas-para-mi-futuro" className="btn-soft">
          Escribir una carta
        </Link>
      </PageTitle>
      <LetterManager rows={rows.map((l) => ({ id: l.id, authorName: l.authorName, relation: l.relation, body: l.body, openAt: l.openAt, status: l.status, createdAt: l.createdAt.toISOString() }))} />
    </div>
  );
}
