import type { MilestoneTypeId, PresentationId, RoleId, SceneId } from "./constants";

export type MediaDTO = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  sm: string;
  md: string;
  lg: string;
  orig: string;
  blur: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
};

export type MemoryDTO = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  scene: SceneId;
  presentation: Exclude<PresentationId, "AUTO">;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  stage: { name: string; color: string } | null;
  media: MediaDTO[];
};

export type MilestoneDTO = {
  id: string;
  type: MilestoneTypeId;
  title: string;
  description: string | null;
  date: string;
  status: "DRAFT" | "PUBLISHED";
  media: MediaDTO | null;
  stage: { name: string; color: string } | null;
};

export type LetterDTO = {
  id: string;
  authorName: string;
  relation: string | null;
  /** null mientras la carta siga sellada para quien la mira */
  body: string | null;
  openAt: string | null;
  sealed: boolean;
  mine: boolean;
  createdAt: string;
};

export type BirthDTO = {
  birthDate: string | null;
  birthTime: string | null;
  weight: string | null;
  height: string | null;
  place: string | null;
  firstMeeting: string | null;
  note: string | null;
  mainPhoto: MediaDTO | null;
};

export type SceneDTO = { id: SceneId; title: string; phrase: string | null; subtitle: string | null; enabled: boolean };

export type ViewerDTO = { id: string; name: string; role: RoleId; relation: string | null };

export type StoryData = {
  viewer: ViewerDTO;
  preview: boolean;
  scenes: SceneDTO[];
  memories: Record<SceneId, MemoryDTO[]>;
  birth: BirthDTO;
  milestones: MilestoneDTO[];
  letters: LetterDTO[];
};
