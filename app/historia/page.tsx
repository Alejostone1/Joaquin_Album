import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StoryExperience } from "@/components/story/StoryExperience";
import { getCurrentUser } from "@/lib/auth";
import { getGuest } from "@/lib/guest";
import { getStoryData } from "@/lib/story";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Su historia — Joaquín", robots: { index: false, follow: false } };

export default async function HistoriaPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await getCurrentUser();
  const guest = user ? null : await getGuest();
  if (!user && !guest) redirect("/?acceso=1");
  const { preview } = await searchParams;
  const data = await getStoryData(user ?? { guest: true, label: guest!.label }, { preview: preview === "1" });
  return <StoryExperience data={data} />;
}
