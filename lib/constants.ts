// Constantes compartidas (cliente y servidor).

export const SCENES = [
  "ANTES",
  "LLEGADA",
  "PRIMEROS_DIAS",
  "CRECIENDO",
  "FAMILIA",
  "AVENTURAS",
  "CARTAS",
] as const;
export type SceneId = (typeof SCENES)[number];

export type SceneMeta = {
  id: SceneId;
  slug: string;
  chapter: string;
  title: string;
  phrase: string;
  /** color de acento del capítulo */
  accent: string;
  /** color de fondo acuarelado */
  wash: string;
  /** dinosaurio que acompaña el capítulo */
  companion: "stego" | "trice" | "ptero" | "baby";
};

export const SCENE_META: Record<SceneId, SceneMeta> = {
  ANTES: {
    id: "ANTES",
    slug: "antes-de-conocerte",
    chapter: "Capítulo 1",
    title: "Antes de conocerte",
    phrase: "Antes de conocerte, ya eras parte de nuestros sueños.",
    accent: "#2BA36B",
    wash: "#E3F2E1",
    companion: "stego",
  },
  LLEGADA: {
    id: "LLEGADA",
    slug: "el-dia-que-llegaste",
    chapter: "Capítulo 2",
    title: "El día que llegaste",
    phrase: "Y de repente, el mundo tuvo un nuevo centro.",
    accent: "#FF8A7A",
    wash: "#FFE9E1",
    companion: "baby",
  },
  PRIMEROS_DIAS: {
    id: "PRIMEROS_DIAS",
    slug: "mis-primeros-dias",
    chapter: "Capítulo 3",
    title: "Mis primeros días",
    phrase: "Bostezos, manitas y siestas que lo cambiaron todo.",
    accent: "#1FB5B0",
    wash: "#DDF5F3",
    companion: "trice",
  },
  CRECIENDO: {
    id: "CRECIENDO",
    slug: "asi-voy-creciendo",
    chapter: "Capítulo 4",
    title: "Así voy creciendo",
    phrase: "Cada mes, un paso más grande que el anterior.",
    accent: "#F2A516",
    wash: "#FFF4D6",
    companion: "stego",
  },
  FAMILIA: {
    id: "FAMILIA",
    slug: "mi-familia",
    chapter: "Capítulo 5",
    title: "Mi familia",
    phrase: "Los brazos que me sostienen y las voces que me cantan.",
    accent: "#E86A9A",
    wash: "#FFE6EF",
    companion: "trice",
  },
  AVENTURAS: {
    id: "AVENTURAS",
    slug: "mis-aventuras",
    chapter: "Capítulo 6",
    title: "Mis aventuras",
    phrase: "El mundo es enorme y yo quiero verlo todo.",
    accent: "#3C9BE0",
    wash: "#E2F2FC",
    companion: "ptero",
  },
  CARTAS: {
    id: "CARTAS",
    slug: "cartas-para-mi-futuro",
    chapter: "Capítulo 7",
    title: "Cartas para mi futuro",
    phrase: "Palabras guardadas para cuando seas grande.",
    accent: "#FF9F68",
    wash: "#FFF0E4",
    companion: "baby",
  },
};

export const PRESENTATIONS = [
  "AUTO",
  "CINEMATIC",
  "PARALLAX",
  "ZOOM",
  "EDITORIAL",
  "OVERLAP",
  "COLLAGE",
  "SEQUENCE",
  "REVEAL",
  "MASK",
] as const;
export type PresentationId = (typeof PRESENTATIONS)[number];

export const PRESENTATION_LABELS: Record<PresentationId, { name: string; hint: string }> = {
  AUTO: { name: "Automático", hint: "Elige un estilo según las fotos" },
  CINEMATIC: { name: "Cine", hint: "Pantalla completa con franjas de película" },
  PARALLAX: { name: "Parallax", hint: "Capas que se mueven a distinta velocidad" },
  ZOOM: { name: "Zoom suave", hint: "La foto se acerca lentamente al bajar" },
  EDITORIAL: { name: "Editorial", hint: "Composición de revista con texto grande" },
  OVERLAP: { name: "Superpuestas", hint: "Fotos tipo polaroid que se abren en abanico" },
  COLLAGE: { name: "Collage", hint: "Mosaico dinámico con varias fotos" },
  SEQUENCE: { name: "Secuencia", hint: "Las fotos se suceden mientras bajas" },
  REVEAL: { name: "Revelado", hint: "La foto aparece poco a poco" },
  MASK: { name: "Máscara", hint: "Se descubre a través de una huella o un huevo" },
};

export const MILESTONE_TYPES = [
  "MES",
  "CUMPLEANOS",
  "PALABRA",
  "PASOS",
  "VIAJE",
  "JUEGO",
  "DESCUBRIMIENTO",
  "ESPECIAL",
] as const;
export type MilestoneTypeId = (typeof MILESTONE_TYPES)[number];

export const MILESTONE_LABELS: Record<MilestoneTypeId, { name: string; color: string; icon: string }> = {
  MES: { name: "Cumple mes", color: "#2BA36B", icon: "moon" },
  CUMPLEANOS: { name: "Cumpleaños", color: "#FF8A7A", icon: "cake" },
  PALABRA: { name: "Primeras palabras", color: "#E86A9A", icon: "bubble" },
  PASOS: { name: "Primeros pasos", color: "#F2A516", icon: "foot" },
  VIAJE: { name: "Viaje", color: "#3C9BE0", icon: "plane" },
  JUEGO: { name: "Juego", color: "#1FB5B0", icon: "ball" },
  DESCUBRIMIENTO: { name: "Descubrimiento", color: "#9B7BE0", icon: "star" },
  ESPECIAL: { name: "Momento especial", color: "#FF9F68", icon: "heart" },
};

export const ROLE_LABELS = {
  ADMIN: { name: "Administrador", hint: "Gestiona todo, incluidas las personas con acceso" },
  EDITOR: { name: "Editor", hint: "Sube fotos y videos, crea y publica recuerdos" },
  FAMILY: { name: "Familia", hint: "Ve la historia y escribe cartas" },
} as const;
export type RoleId = keyof typeof ROLE_LABELS;

/** Paleta oficial — usada también por los materiales 3D. */
export const PALETTE = {
  salvia: "#A8C3A0",
  bosque: "#2F5D47",
  esmeralda: "#2BA36B",
  menta: "#BDECD3",
  sol: "#FFC93C",
  vainilla: "#FFE89A",
  cielo: "#8FD3F4",
  turquesa: "#1FB5B0",
  coral: "#FF8A7A",
  melocoton: "#FFB38A",
  rosa: "#FFB7CF",
  crema: "#FFF6E6",
  blanco: "#FFFCF5",
  tinta: "#21372B",
} as const;
