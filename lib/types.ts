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
  /** quién lo publicó (y quién lo editó por última vez, si fue otra persona) */
  author: { name: string; relation: string | null } | null;
  editor: { name: string; relation: string | null } | null;
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

export type ViewerDTO = { id: string; name: string; role: RoleId; relation: string | null; guest?: boolean };

export type Companion = "stego" | "trice" | "ptero" | "baby";

/** Un capítulo tal como se muestra: los siete de la historia y los que crea la familia. */
export type ChapterDTO = {
  key: string;
  slug: string;
  /** capítulo de la historia (null si lo creó la familia) */
  builtin: SceneId | null;
  /** valor para el formulario: "ANTES" o "c:<id>" */
  target: string;
  title: string;
  subtitle: string | null;
  phrase: string | null;
  accent: string;
  wash: string;
  companion: Companion;
  memories: MemoryDTO[];
};

export type StoryData = {
  viewer: ViewerDTO;
  preview: boolean;
  chapters: ChapterDTO[];
  birth: BirthDTO;
  milestones: MilestoneDTO[];
  letters: LetterDTO[];
};
