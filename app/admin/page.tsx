import { and, desc, eq, isNull, notInArray, or } from "drizzle-orm";
import Link from "next/link";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { PageTitle, Panel, StatusBadge } from "@/components/admin/ui";
import { StegoArt } from "@/components/ui/DinoArt";
import { WatercolorBlob } from "@/components/ui/Watercolor";
import { redirect } from "next/navigation";
import { getCurrentUser, getOwnerIds, hasRole, requireUser } from "@/lib/auth";
import { SCENE_META } from "@/lib/constants";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function AdminHome() {
  const current = await getCurrentUser();
  if (current && !hasRole(current, "EDITOR")) redirect("/admin/cuenta");
  const user = await requireUser("EDITOR");
  const owners = user.isOwner ? [] : await getOwnerIds();
  const [published, drafts, photos, videos, moments, letters, people, recent, activity] = await Promise.all([
    db.$count(schema.memories, eq(schema.memories.status, "PUBLISHED")),
    db.$count(schema.memories, eq(schema.memories.status, "DRAFT")),
    db.$count(schema.media, eq(schema.media.kind, "IMAGE")),
    db.$count(schema.media, eq(schema.media.kind, "VIDEO")),
    db.$count(schema.milestones),
    db.$count(schema.letters),
    db.$count(schema.users, owners.length ? notInArray(schema.users.id, owners) : undefined),
    db.query.memories.findMany({ orderBy: [desc(schema.memories.updatedAt)], limit: 6, with: { author: { columns: { name: true, isOwner: true } }, chapter: { columns: { title: true } } } }),
    db
      .select()
      .from(schema.activity)
      .where(owners.length ? and(or(isNull(schema.activity.userId), notInArray(schema.activity.userId, owners))) : undefined)
      .orderBy(desc(schema.activity.createdAt))
      .limit(40),
  ]);
  const stats = [
    { n: published, label: "recuerdos publicados", color: "#FF8A7A", href: "/admin/recuerdos" },
    { n: drafts, label: "borradores", color: "#FFC93C", href: "/admin/recuerdos?estado=borradores" },
    { n: photos, label: "fotos", color: "#1FB5B0", href: "/admin/biblioteca" },
    { n: videos, label: "videos", color: "#3C9BE0", href: "/admin/biblioteca" },
    { n: moments, label: "momentos en la línea de tiempo", color: "#F2A516", href: "/admin/linea-de-tiempo" },
    { n: letters, label: "cartas", color: "#E86A9A", href: "/admin/cartas" },
    { n: people, label: "personas con acceso", color: "#9B7BE0", href: "/admin/usuarios" },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative mb-10 overflow-hidden rounded-[2.2rem] bg-menta-50 p-7 sm:p-10">
        <WatercolorBlob color="#FFE89A" seed={3} className="absolute -right-10 -top-16 h-72 w-72" opacity={0.6} />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-esmeralda">Administrador familiar</p>
            <h1 className="mt-2 font-heading text-4xl font-extrabold sm:text-5xl">Hola, {user.name.split(" ")[0]}</h1>
            <p className="mt-2 max-w-md text-lg text-tinta-soft">¿Qué vamos a guardar hoy en la historia de Joaquín?</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/admin/recuerdos/nuevo" className="btn-candy">
                Crear un recuerdo con fotos
              </Link>
              <Link href="/admin/biblioteca" className="btn-soft">
                Ver la biblioteca
              </Link>
              <Link href="/admin/linea-de-tiempo" className="btn-soft">
                Agregar un momento
              </Link>
            </div>
          </div>
          <StegoArt className="w-52" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-[1.6rem] border-2 border-tinta/10 bg-papel p-5 transition hover:-translate-y-1 hover:shadow-soft">
            <p className="font-display text-5xl font-semibold" style={{ color: s.color }}>
              {s.n}
            </p>
            <p className="mt-1 font-ui text-sm font-bold text-tinta-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <div>
        <PageTitle title="Lo que hizo la familia" kicker="Historial" color="#E86A9A">
          <Link href="/admin/historial" className="btn-soft py-2 text-sm">
            Ver todo
          </Link>
        </PageTitle>
        <ActivityFeed compact rows={activity.map((r) => ({ id: r.id, userName: r.userName, action: r.action, entity: r.entity, entityId: r.entityId, summary: r.summary, createdAt: r.createdAt.toISOString() }))} />
      </div>
      <div>
        <PageTitle title="Últimos cambios" kicker="Recuerdos" color="#FF8A7A" />
        <Panel className="divide-y-2 divide-tinta/5 p-0 sm:p-0">
          {recent.length === 0 && <p className="p-6 text-tinta-soft">Todavía no hay recuerdos. Empieza subiendo algunas fotos.</p>}
          {recent.map((m) => (
            <Link key={m.id} href={`/admin/recuerdos/${m.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-crema/60">
              <div>
                <p className="font-heading text-lg font-bold">{m.title}</p>
                <p className="font-ui text-xs font-bold text-tinta-mute">
                  {m.chapter?.title ?? SCENE_META[m.scene].title}
                  {m.date ? ` · ${formatDate(m.date)}` : ""}
                  {m.author && (!m.author.isOwner || user.isOwner) ? ` · por ${m.author.name}` : ""}
                </p>
              </div>
              <StatusBadge status={m.status} />
            </Link>
          ))}
        </Panel>
      </div>
      </div>
    </div>
  );
}
