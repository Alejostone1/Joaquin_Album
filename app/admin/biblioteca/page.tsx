import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";

export default async function BibliotecaPage() {
  await requireUser("EDITOR");
  const items = await loadLibrary();
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Fotos y videos" kicker="Biblioteca privada" color="#1FB5B0" />
      <MediaLibrary initial={items} />
    </div>
  );
}
