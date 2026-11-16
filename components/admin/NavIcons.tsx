"use client";

/**
 * Íconos ilustrados y animados del menú del administrador.
 * Estilo "sticker": colores del álbum, contorno tinta y pequeñas animaciones en bucle.
 * Las animaciones se pausan con la clase .ni-paused (y respetan "reducir movimiento").
 */

export type NavIconName = "home" | "photo" | "heart" | "clock" | "egg" | "steps" | "mail" | "book" | "list" | "people" | "share" | "user";

const INK = "#21372B";
const sw = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function NavIcon({ name, color, className = "h-12 w-12", paused = false }: { name: NavIconName; color: string; className?: string; paused?: boolean }) {
  const c = color;
  const art: Record<NavIconName, React.ReactNode> = {
    home: (
      <>
        <rect x="31" y="9" width="5" height="9" fill="#F4E3C3" {...sw} />
        <circle className="ni-smoke" cx="33.5" cy="6" r="2.2" fill="#fff" stroke={INK} strokeWidth={1.6} />
        <circle className="ni-smoke ni-d2" cx="35" cy="5" r="1.6" fill="#fff" stroke={INK} strokeWidth={1.4} />
        <path d="M10 23v15a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V23" fill="#FFFCF5" {...sw} />
        <path d="M6 24 24 9l18 15" fill={c} {...sw} />
        <rect x="20" y="28" width="8" height="12" rx="1.5" fill={c} {...sw} />
        <rect className="ni-blink" x="12.5" y="27" width="5" height="5" rx="1" fill="#FFC93C" {...sw} strokeWidth={1.8} />
        <rect className="ni-blink ni-d2" x="30.5" y="27" width="5" height="5" rx="1" fill="#FFC93C" {...sw} strokeWidth={1.8} />
      </>
    ),
    photo: (
      <>
        <g transform="rotate(-12 18 24)">
          <rect x="7" y="12" width="22" height="26" rx="2" fill="#fff" {...sw} />
        </g>
        <g className="ni-bob">
          <rect x="16" y="9" width="25" height="29" rx="2" fill="#fff" {...sw} />
          <rect x="19" y="12" width="19" height="17" fill="#BFE7F6" stroke={INK} strokeWidth={1.6} />
          <circle className="ni-pulse" cx="33" cy="17" r="2.8" fill="#FFC93C" />
          <path d="M19 29l6-7 4 4 3-3 6 6z" fill={c} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        </g>
        <path className="ni-twinkle" d="M42 6l1.2 2.8L46 10l-2.8 1.2L42 14l-1.2-2.8L38 10l2.8-1.2z" fill="#FFC93C" stroke={INK} strokeWidth={1.2} />
      </>
    ),
    heart: (
      <>
        <path className="ni-beat" d="M24 40S8 31 8 19.5A8 8 0 0 1 24 15a8 8 0 0 1 16 4.5C40 31 24 40 24 40z" fill={c} {...sw} />
        <path d="M14 18.5a4 4 0 0 1 4-3.5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity=".8" />
        <path className="ni-float" d="M38 12s-4-2.4-4-5.2a2 2 0 0 1 4-1 2 2 0 0 1 4 1C42 9.6 38 12 38 12z" fill="#FFB7CF" stroke={INK} strokeWidth={1.4} />
      </>
    ),
    clock: (
      <>
        <circle cx="14" cy="11" r="4.5" fill={c} {...sw} />
        <circle cx="34" cy="11" r="4.5" fill={c} {...sw} />
        <circle cx="24" cy="26" r="15" fill="#FFFCF5" {...sw} />
        <circle cx="24" cy="26" r="11" fill={`${c}26`} />
        {[0, 90, 180, 270].map((a) => (
          <line key={a} x1="24" y1="14" x2="24" y2="16.5" stroke={INK} strokeWidth={2} strokeLinecap="round" transform={`rotate(${a} 24 26)`} />
        ))}
        <line x1="24" y1="26" x2="19" y2="22" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <line className="ni-hand" x1="24" y1="26" x2="24" y2="16" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
        <circle cx="24" cy="26" r="2" fill={INK} />
      </>
    ),
    egg: (
      <>
        <ellipse cx="24" cy="42.5" rx="10" ry="2" fill={INK} opacity=".12" />
        <g className="ni-wobble">
          <path d="M24 6c-8 0-13 13-13 21a13 13 0 0 0 26 0c0-8-5-21-13-21z" fill="#FFE4EC" {...sw} />
          <circle cx="18" cy="30" r="2.6" fill={c} opacity=".7" />
          <circle cx="29" cy="22" r="2" fill={c} opacity=".7" />
          <circle cx="28" cy="33" r="1.6" fill={c} opacity=".7" />
          <path d="M14 24l4 2 3-3 3 3 3-3 3 3 4-2" fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        </g>
      </>
    ),
    steps: (
      <>
        {[
          { x: 9, y: 33, r: -18, k: "" },
          { x: 21, y: 22, r: 14, k: "ni-d2" },
          { x: 33, y: 11, r: -18, k: "ni-d3" },
        ].map((f, i) => (
          <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.r})`}>
            <g className={`ni-step ${f.k}`}>
              <ellipse cx="0" cy="3" rx="4.6" ry="4" fill={c} stroke={INK} strokeWidth={1.6} />
              <ellipse cx="-4" cy="-3.5" rx="1.6" ry="2.3" fill={c} stroke={INK} strokeWidth={1.3} />
              <ellipse cx="0" cy="-5" rx="1.6" ry="2.4" fill={c} stroke={INK} strokeWidth={1.3} />
              <ellipse cx="4" cy="-3.5" rx="1.6" ry="2.3" fill={c} stroke={INK} strokeWidth={1.3} />
            </g>
          </g>
        ))}
      </>
    ),
    mail: (
      <>
        <path className="ni-pop" d="M24 20s-5-3-5-6.4a2.6 2.6 0 0 1 5-1.2 2.6 2.6 0 0 1 5 1.2C29 17 24 20 24 20z" fill="#FF6F91" stroke={INK} strokeWidth={1.5} />
        <rect x="7" y="17" width="34" height="23" rx="3" fill="#FFFCF5" {...sw} />
        <path d="M7.5 38l12.5-10M40.5 38L28 28" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        <path className="ni-flap" d="M8 19l16 12 16-12" fill={c} {...sw} />
      </>
    ),
    book: (
      <>
        <path d="M24 13c-5-3-11-3-16-1v26c5-2 11-2 16 1z" fill="#FFFCF5" {...sw} />
        <path d="M24 13c5-3 11-3 16-1v26c-5-2-11-2-16 1z" fill="#FFFCF5" {...sw} />
        <path d="M12 18c3-1 6-1 8 0M12 23c3-1 6-1 8 0M12 28c3-1 6-1 8 0" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
        <path className="ni-page" d="M24 13c4-2.4 9-2.6 13-1.4v26c-4-1.2-9-1-13 1.4z" fill={`${c}`} {...sw} strokeWidth={1.8} />
        <path d="M24 13v26" stroke={INK} strokeWidth={2} />
      </>
    ),
    list: (
      <>
        <rect x="10" y="8" width="28" height="34" rx="3" fill="#FFFCF5" {...sw} />
        <rect x="18" y="5" width="12" height="6" rx="2" fill={c} {...sw} strokeWidth={1.8} />
        {[17, 25, 33].map((y, i) => (
          <g key={y}>
            <circle cx="16" cy={y} r="2.6" fill={i === 0 ? c : i === 1 ? "#FFC93C" : "#8FD3F4"} stroke={INK} strokeWidth={1.4} />
            <rect className={`ni-line ${i === 1 ? "ni-d2" : i === 2 ? "ni-d3" : ""}`} x="21" y={y - 1.4} width="13" height="2.8" rx="1.4" fill={INK} opacity=".55" />
          </g>
        ))}
      </>
    ),
    people: (
      <>
        <g className="ni-bob ni-d2">
          <circle cx="32" cy="16" r="5.5" fill="#FFD9C2" {...sw} />
          <path d="M23 38a9 9 0 0 1 18 0z" fill="#8FD3F4" {...sw} />
        </g>
        <g className="ni-bob">
          <circle cx="18" cy="18" r="6" fill="#FFD9C2" {...sw} />
          <path d="M8 40a10 10 0 0 1 20 0z" fill={c} {...sw} />
        </g>
        <path className="ni-float" d="M25 10s-3-1.8-3-3.9a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8C28 8.2 25 10 25 10z" fill="#FF6F91" stroke={INK} strokeWidth={1.2} />
      </>
    ),
    share: (
      <>
        <path d="M14 24l20-11M14 24l20 11" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <circle className="ni-ring" cx="14" cy="24" r="6" fill="none" stroke={c} strokeWidth={2} />
        <circle cx="14" cy="24" r="6" fill={c} {...sw} />
        <circle className="ni-bob" cx="35" cy="12" r="5" fill="#FFC93C" {...sw} />
        <circle className="ni-bob ni-d2" cx="35" cy="36" r="5" fill="#FFB7CF" {...sw} />
      </>
    ),
    user: (
      <>
        <path className="ni-shackle" d="M16 22v-5a8 8 0 0 1 16 0v5" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <rect x="11" y="21" width="26" height="20" rx="4" fill={c} {...sw} />
        <circle cx="24" cy="29.5" r="2.6" fill="#FFC93C" stroke={INK} strokeWidth={1.4} />
        <path d="M24 32v4" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 48 48" className={`ni overflow-visible ${paused ? "ni-paused" : ""} ${className}`} aria-hidden>
      {art[name]}
    </svg>
  );
}
