import type { MilestoneTypeId } from "@/lib/constants";

const paths: Record<string, React.ReactNode> = {
  moon: <path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z" />,
  cake: (
    <>
      <path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
      <path d="M4 16c2 1.4 4 1.4 6 0s4-1.4 6 0 3 1 4 0M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z" />
    </>
  ),
  bubble: <path d="M4 5h16v10H9l-5 4z" />,
  foot: (
    <>
      <ellipse cx="12" cy="15" rx="4.5" ry="4.2" />
      <path d="M8 11 5 4M12 10V3M16 11l3-7" />
    </>
  ),
  plane: <path d="M3 13l18-8-6 16-3-7z" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4 10c5 2 11 2 16 0M6 18c3-5 9-5 12 0" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name] ?? paths.star}
    </svg>
  );
}

export function MilestoneIcon({ type, className }: { type: MilestoneTypeId; className?: string }) {
  const map: Record<MilestoneTypeId, string> = {
    MES: "moon",
    CUMPLEANOS: "cake",
    PALABRA: "bubble",
    PASOS: "foot",
    VIAJE: "plane",
    JUEGO: "ball",
    DESCUBRIMIENTO: "star",
    ESPECIAL: "heart",
  };
  return <Icon name={map[type]} className={className} />;
}
