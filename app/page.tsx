import { IntroExperience } from "@/components/intro/IntroExperience";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ acceso?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  return <IntroExperience userName={user?.name ?? null} askLogin={params.acceso === "1"} />;
}
