import { MediaLibrary } from "@/components/admin/MediaLibrary";
import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";

export default async function BibliotecaPage() {
  await requireUser("EDITOR");
  const items = await loadLibrary();
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Fotos y videos" kicker="Biblioteca privada" color="#1FB5B0">
        <Link href="/admin/recuerdos/nuevo" className="btn-candy">
          Crear un recuerdo con fotos
        </Link>
      </PageTitle>
      <p className="mb-6 rounded-2xl bg-sol-100 px-5 py-4 font-ui text-sm font-bold text-tinta-soft">
        La biblioteca guarda todos los archivos, pero no los muestra en la historia por sí sola. Para que aparezcan, crea un recuerdo: ahí eliges el capítulo y las fotos.
      </p>
      <MediaLibrary initial={items} />
    </div>
  );
}
