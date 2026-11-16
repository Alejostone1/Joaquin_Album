import { IntroExperience } from "@/components/intro/IntroExperience";
import { getCurrentUser } from "@/lib/auth";
import { getGuest } from "@/lib/guest";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ acceso?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const guest = user ? null : await getGuest();
  return <IntroExperience userName={user?.name ?? guest?.label ?? null} askLogin={params.acceso === "1"} />;
}
