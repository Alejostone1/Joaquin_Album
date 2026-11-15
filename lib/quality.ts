// Calidad gráfica adaptativa según el dispositivo.
export type Tier = "high" | "medium" | "low";
export type QualityMode = Tier | "static";

export type TierConfig = {
  dpr: [number, number];
  shadows: number; // tamaño del mapa de sombras (0 = sin sombras)
  ferns: number;
  flowers: number;
  trees: number;
  particles: number;
  butterflies: number;
  rocks: number;
  grass: number;
  bushes: number;
};

export const TIERS: Record<Tier, TierConfig> = {
  high: { dpr: [1, 1.8], shadows: 2048, ferns: 150, flowers: 300, trees: 85, particles: 420, butterflies: 7, rocks: 30, grass: 1100, bushes: 80 },
  medium: { dpr: [1, 1.4], shadows: 1024, ferns: 95, flowers: 180, trees: 58, particles: 240, butterflies: 5, rocks: 20, grass: 600, bushes: 50 },
  low: { dpr: [0.8, 1], shadows: 0, ferns: 45, flowers: 90, trees: 34, particles: 110, butterflies: 3, rocks: 12, grass: 220, bushes: 24 },
};

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Elige el modo inicial; "static" = alternativa 2D ilustrada. */
export function detectQuality(): QualityMode {
  if (typeof window === "undefined") return "medium";
  try {
    const forced = new URLSearchParams(location.search).get("calidad") || localStorage.getItem("jq_quality");
    if (forced === "high" || forced === "medium" || forced === "low" || forced === "static") return forced;
  } catch {
    /* noop */
  }
  if (!hasWebGL()) return "static";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "low";
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (cores <= 2 || mem <= 2) return "low";
  if (small || cores <= 4 || mem <= 4) return "medium";
  return "high";
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
