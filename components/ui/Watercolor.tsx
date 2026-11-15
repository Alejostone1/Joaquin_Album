import { useId } from "react";

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Contorno orgánico cerrado (Catmull-Rom → Bézier) */
export function blobPath(seed: number, points = 9, cx = 50, cy = 50, r = 38, wobble = 0.22) {
  const rand = rng(seed);
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rand() * wobble);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/** Filtro de acuarela: borde irregular, granulado de pigmento y borde más oscuro. */
export function WatercolorFilter({ id, seed = 2, warp = 16 }: { id: string; seed?: number; warp?: number }) {
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed={seed} result="warp" />
      <feDisplacementMap in="SourceGraphic" in2="warp" scale={warp} xChannelSelector="R" yChannelSelector="G" result="shape" />
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed={seed + 7} result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="grainA" />
      <feComposite in="shape" in2="grainA" operator="in" result="grained" />
      <feMorphology in="shape" operator="erode" radius="2.2" result="inner" />
      <feComposite in="shape" in2="inner" operator="out" result="rim" />
      <feGaussianBlur in="rim" stdDeviation="0.7" result="rimSoft" />
      <feMerge>
        <feMergeNode in="grained" />
        <feMergeNode in="rimSoft" />
      </feMerge>
    </filter>
  );
}

type BlobProps = {
  color: string;
  seed?: number;
  className?: string;
  opacity?: number;
  style?: React.CSSProperties;
};

/** Mancha de acuarela decorativa */
export function WatercolorBlob({ color, seed = 1, className = "", opacity = 0.5, style }: BlobProps) {
  const fid = `wc-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" className={`pointer-events-none ${className}`} style={style} aria-hidden>
      <defs>
        <WatercolorFilter id={fid} seed={seed} />
      </defs>
      <g filter={`url(#${fid})`} opacity={opacity}>
        <path d={blobPath(seed)} fill={color} />
        <path d={blobPath(seed + 11, 7, 46, 46, 22, 0.35)} fill={color} opacity={0.55} />
      </g>
    </svg>
  );
}

/** Huella de dinosaurio de tres dedos */
export function Footprint({ color = "#7A8B4A", className = "", style }: { color?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 44" className={className} style={style} aria-hidden>
      <g fill={color}>
        <ellipse cx="20" cy="30" rx="10.5" ry="10" />
        <path d="M11 24c-3-5-6-10-6.5-15.5C4.2 6 7 5 8.3 7.2c2.2 4 4.5 8.6 6.5 13.3z" />
        <path d="M17 21c-.6-6-.8-11.6.3-17.2.5-2.4 4.4-2.4 4.9 0 1.1 5.6.9 11.2.3 17.2z" />
        <path d="M29 24c3-5 6-10 6.5-15.5C35.8 6 33 5 31.7 7.2c-2.2 4-4.5 8.6-6.5 13.3z" />
      </g>
    </svg>
  );
}

/** Hoja de helecho acuarelada */
export function FernLeaf({ color = "#2F5D47", className = "", style }: { color?: string; className?: string; style?: React.CSSProperties }) {
  const leaflets = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 60 120" className={className} style={style} aria-hidden>
      <path d="M30 118 C30 80 31 40 30 6" stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {leaflets.map((i) => {
        const y = 104 - i * 11;
        const len = 22 - i * 1.9;
        return (
          <g key={i} fill={color} opacity={0.85 - i * 0.03}>
            <path d={`M30 ${y} q -${len * 0.6} -4 -${len} -${8 + i * 0.4} q ${len * 0.55} 1 ${len} ${8 + i * 0.4}z`} />
            <path d={`M30 ${y - 3} q ${len * 0.6} -4 ${len} -${8 + i * 0.4} q -${len * 0.55} 1 -${len} ${8 + i * 0.4}z`} />
          </g>
        );
      })}
    </svg>
  );
}

/** Huevo de dinosaurio con manchas */
export function EggIcon({ base = "#F6D2C4", spot = "#E2A58F", className = "" }: { base?: string; spot?: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden>
      <path d="M20 2C10 2 3 18 3 29c0 10 7.6 17 17 17s17-7 17-17C37 18 30 2 20 2z" fill={base} stroke="#21372B" strokeWidth="2.4" />
      <circle cx="13" cy="24" r="3.2" fill={spot} />
      <circle cx="25" cy="16" r="2.4" fill={spot} />
      <circle cx="27" cy="33" r="3.6" fill={spot} />
      <path d="M10 12c2-3 4-5 6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" fill="none" />
    </svg>
  );
}
