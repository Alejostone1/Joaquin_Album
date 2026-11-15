import { BirthForm } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { loadLibrary } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NacimientoPage() {
  await requireUser("EDITOR");
  const [b, library] = await Promise.all([db.query.birthInfo.findFirst(), loadLibrary()]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="El día que llegaste" kicker="Datos del nacimiento" color="#E86A9A" />
      <BirthForm
        library={library}
        row={{
          birthDate: b?.birthDate ?? "",
          birthTime: b?.birthTime ?? "",
          weight: b?.weight ?? "",
          height: b?.height ?? "",
          place: b?.place ?? "",
          firstMeeting: b?.firstMeeting ?? "",
          note: b?.note ?? "",
          mainPhotoId: b?.mainPhotoId ?? "",
        }}
      />
    </div>
  );
}
