import * as THREE from "three";

const texCache = new Map<string, THREE.Texture>();
const matCache = new Map<string, THREE.Material>();

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Textura de piel con manchas acuareladas (como las ilustraciones de la habitación):
 * base de color, manchas más oscuras de distintos tamaños y un leve granulado.
 */
export function spotTexture(base: string, spot: string, seed = 7, density = 1) {
  const key = `${base}-${spot}-${seed}-${density}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const rand = seeded(seed * 7919 + 13);
  // lavado irregular
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 40 + rand() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.08)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // manchas
  const count = Math.round(70 * density);
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 5 + Math.pow(rand(), 2.2) * 26;
    g.globalAlpha = 0.45 + rand() * 0.4;
    g.fillStyle = spot;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.75 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
    // borde acuarelado más intenso
    g.globalAlpha *= 0.6;
    g.lineWidth = 1.5;
    g.strokeStyle = spot;
    g.stroke();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Material "vinilo suave" de juguete, como la referencia 3D del bebé dinosaurio. */
export function skin(color: string, opts: { spots?: string; seed?: number; density?: number; rough?: number; repeat?: number } = {}) {
  const key = `skin-${color}-${opts.spots}-${opts.seed}-${opts.density}-${opts.rough}-${opts.repeat}`;
  const hit = matCache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({
    color: opts.spots ? "#ffffff" : color,
    roughness: opts.rough ?? 0.55,
    metalness: 0,
  });
  if (opts.spots) {
    const t = spotTexture(color, opts.spots, opts.seed ?? 3, opts.density ?? 1).clone();
    t.needsUpdate = true;
    t.repeat.set(opts.repeat ?? 1, opts.repeat ?? 1);
    m.map = t;
  }
  matCache.set(key, m);
  return m;
}

export function glossy(color: string) {
  const key = `gloss-${color}`;
  const hit = matCache.get(key);
  if (hit) return hit as THREE.MeshPhysicalMaterial;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  matCache.set(key, m);
  return m;
}

export function flat(color: string, opacity = 1) {
  const key = `flat-${color}-${opacity}`;
  const hit = matCache.get(key);
  if (hit) return hit as THREE.MeshBasicMaterial;
  const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  matCache.set(key, m);
  return m;
}

export function blush() {
  const key = "blush";
  const hit = matCache.get(key);
  if (hit) return hit as THREE.MeshBasicMaterial;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,120,140,0.85)");
  grad.addColorStop(0.6, "rgba(255,140,155,0.45)");
  grad.addColorStop(1, "rgba(255,150,160,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  matCache.set(key, m);
  return m;
}

/** Textura radial suave para partículas, rayos de luz y halos. */
export function softDot() {
  const key = "softdot";
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  texCache.set(key, tex);
  return tex;
}

export const COLORS = {
  stego: { body: "#8CC97E", spots: "#5E9F55", belly: "#F1EDC2", plates: "#4F8F4A" },
  trice: { body: "#9CCF8C", spots: "#6AA35E", belly: "#F3EEC8", frill: "#7FB86F", horn: "#F4E3C1" },
  ptero: { body: "#A6D98F", spots: "#78B066", wing: "#BFE6A8", belly: "#F3EEC8", crest: "#F2A516" },
  baby: { body: "#AEE3D0", spots: "#7CC8B1", belly: "#F6F1D6", spikes: "#D3F3E6", bow: "#3CB863" },
  eye: "#1A2620",
  iris: "#6E7F2E",
  mouth: "#3B2A26",
  toe: "#FFF8EA",
};
