import { asc } from "drizzle-orm";
import { UserManager } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function UsuariosPage() {
  const me = await requireUser("ADMIN");
  const all = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));
  // el dueño del álbum es invisible para los demás administradores
  const rows = me.isOwner ? all : all.filter((u) => !u.isOwner);
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Personas con acceso" kicker="Sólo administradores" color="#9B7BE0" />
      <UserManager meId={me.id} rows={rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, relation: u.relation, active: u.active, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, pending: !u.passwordHash, owner: u.isOwner, inviteActive: !!u.inviteExpiresAt && u.inviteExpiresAt > new Date() }))} />
    </div>
  );
}
