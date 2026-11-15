import { useId } from "react";
import { WatercolorFilter } from "./Watercolor";

type ArtProps = { className?: string; style?: React.CSSProperties };

/** Ilustraciones acuareladas 2D de los personajes (alternativa sin 3D y decoración). */
export function StegoArt({ className = "", style }: ArtProps) {
  const id = `st-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 260 180" className={className} style={style} role="img" aria-label="Estegosaurio bebé">
      <defs>
        <WatercolorFilter id={id} seed={3} warp={6} />
      </defs>
      <g filter={`url(#${id})`}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 70 + i * 22;
          const h = 26 + Math.sin((i / 5) * Math.PI) * 22;
          const y = 72 - Math.sin(((i + 0.5) / 6) * Math.PI) * 18;
          return <path key={i} d={`M${x - 12} ${y + 14} Q${x} ${y - h} ${x + 12} ${y + 14}Z`} fill="#4F8F4A" />;
        })}
        <path d="M40 112 C 20 108 8 118 4 104 C 20 110 34 96 52 98Z" fill="#8CC97E" />
        <ellipse cx="118" cy="106" rx="72" ry="44" fill="#8CC97E" />
        <ellipse cx="122" cy="122" rx="56" ry="24" fill="#F1EDC2" />
        <rect x="70" y="128" width="22" height="34" rx="10" fill="#8CC97E" />
        <rect x="140" y="128" width="22" height="34" rx="10" fill="#8CC97E" />
        <circle cx="196" cy="88" r="36" fill="#8CC97E" />
        <circle cx="105" cy="94" r="7" fill="#5E9F55" />
        <circle cx="132" cy="84" r="5" fill="#5E9F55" />
        <circle cx="88" cy="112" r="5" fill="#5E9F55" />
      </g>
      <circle cx="206" cy="82" r="8.5" fill="#1A2620" />
      <circle cx="203" cy="78.5" r="3" fill="#fff" />
      <ellipse cx="214" cy="98" rx="9" ry="6" fill="#FF8A9A" opacity=".6" />
      <path d="M210 104 q8 6 16 -2" stroke="#3B2A26" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TriceArt({ className = "", style }: ArtProps) {
  const id = `tr-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 240 180" className={className} style={style} role="img" aria-label="Triceratops bebé">
      <defs>
        <WatercolorFilter id={id} seed={5} warp={6} />
      </defs>
      <g filter={`url(#${id})`}>
        <path d="M30 110 C 14 110 6 120 2 112 C 14 104 26 98 40 100Z" fill="#9CCF8C" />
        <ellipse cx="100" cy="110" rx="66" ry="44" fill="#9CCF8C" />
        <ellipse cx="102" cy="126" rx="50" ry="22" fill="#F3EEC8" />
        <rect x="58" y="130" width="24" height="32" rx="11" fill="#9CCF8C" />
        <rect x="118" y="130" width="24" height="32" rx="11" fill="#9CCF8C" />
        <circle cx="168" cy="72" r="46" fill="#7FB86F" />
        <circle cx="178" cy="96" r="34" fill="#9CCF8C" />
      </g>
      <path d="M170 64 l-6 -22 l12 18z M196 66 l10 -20 l-2 22z" fill="#F4E3C1" stroke="#21372B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M206 96 l14 -8 l-8 14z" fill="#F4E3C1" stroke="#21372B" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="186" cy="90" r="8" fill="#1A2620" />
      <circle cx="183" cy="87" r="3" fill="#fff" />
      <ellipse cx="196" cy="106" rx="8" ry="5.5" fill="#FF8A9A" opacity=".6" />
      <path d="M190 113 q8 6 15 -1" stroke="#3B2A26" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function PteroArt({ className = "", style }: ArtProps) {
  const id = `pt-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 240 160" className={className} style={style} role="img" aria-label="Pterodáctilo bebé">
      <defs>
        <WatercolorFilter id={id} seed={8} warp={6} />
      </defs>
      <g filter={`url(#${id})`}>
        <path d="M120 80 C 90 40 40 30 6 50 C 40 60 60 80 70 100 C 90 92 106 92 120 96Z" fill="#BFE6A8" />
        <path d="M120 80 C 150 40 200 30 234 50 C 200 60 180 80 170 100 C 150 92 134 92 120 96Z" fill="#BFE6A8" />
        <ellipse cx="120" cy="96" rx="22" ry="28" fill="#A6D98F" />
        <circle cx="120" cy="58" r="24" fill="#A6D98F" />
        <path d="M128 64 L170 70 L130 74Z" fill="#F4E3C1" />
        <path d="M108 44 L84 30 L112 54Z" fill="#F2A516" />
      </g>
      <circle cx="126" cy="54" r="6" fill="#1A2620" />
      <circle cx="124" cy="51.5" r="2.2" fill="#fff" />
      <ellipse cx="114" cy="66" rx="6" ry="4" fill="#FF8A9A" opacity=".6" />
    </svg>
  );
}
