import type { Metadata } from "next";
import { StoryExperience } from "@/components/story/StoryExperience";
import { requireUser } from "@/lib/auth";
import { getStoryData } from "@/lib/story";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Su historia — Joaquín" };

export default async function HistoriaPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await requireUser("FAMILY");
  const { preview } = await searchParams;
  const data = await getStoryData(user, { preview: preview === "1" });
  return <StoryExperience data={data} />;
}
