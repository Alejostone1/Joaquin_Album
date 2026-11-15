import { PasswordForm } from "@/components/admin/managers";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

export default async function CuentaPage() {
  const me = await requireUser("FAMILY");
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Mi cuenta" kicker={`${me.name} · ${ROLE_LABELS[me.role].name}`} color="#6E8075" />
      <PasswordForm />
    </div>
  );
}
