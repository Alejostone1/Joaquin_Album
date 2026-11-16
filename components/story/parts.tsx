"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { formatDate } from "@/lib/format";
import type { MemoryDTO } from "@/lib/types";

export type P = { memory: MemoryDTO; accent: string; index: number };

export function Meta({ memory, accent, light = false }: { memory: MemoryDTO; accent: string; light?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 font-ui text-xs font-bold ${light ? "text-papel/90" : "text-tinta-soft"}`}>
      {memory.status === "DRAFT" && <span className="chip bg-sol text-tinta">Borrador · sólo editores</span>}
      {memory.date && (
        <span className="chip" style={{ background: light ? "rgba(255,252,245,.18)" : `${accent}22`, color: light ? undefined : accent }}>
          {formatDate(memory.date)}
        </span>
      )}
      {memory.stage && (
        <span className="chip" style={{ background: `${memory.stage.color}33` }}>
          {memory.stage.name}
        </span>
      )}
      {memory.author && (
        <span className={`chip gap-1.5 ${light ? "bg-white/15" : "bg-papel"}`} title={memory.editor ? `Editado por ${memory.editor.name}` : undefined}>
          <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-extrabold text-papel" style={{ background: accent }}>
            {memory.author.name.slice(0, 1).toUpperCase()}
          </span>
          por {memory.author.name}
          {memory.author.relation ? ` · ${memory.author.relation}` : ""}
        </span>
      )}
      {memory.tags.map((t) => (
        <span key={t} className={`chip ${light ? "bg-white/15" : "bg-tinta/5"}`}>
          #{t}
        </span>
      ))}
    </div>
  );
}

export function Title({ children, className = "", accent }: { children: string; className?: string; accent?: string }) {
  // la primera palabra lleva el color del capítulo; las palabras suben una a una
  const words = children.split(" ");
  return (
    <motion.h3
      className={`font-heading font-extrabold leading-[0.95] ${className}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {words.map((w, i) => (
        <span key={i} className={`inline-block overflow-hidden pb-[0.06em] align-bottom ${i < words.length - 1 ? "mr-[0.24em]" : ""}`}>
          <motion.span
            className="inline-block"
            style={i === 0 && accent ? { color: accent } : undefined}
            variants={{ hidden: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: { type: "spring", stiffness: 170, damping: 18 } } }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h3>
  );
}

/** Inclinación 3D suave que sigue al cursor */
export function Tilt({ children, className = "", max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  return (
    <motion.div
      className={className}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * max);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function NoMedia({ memory, accent }: { memory: MemoryDTO; accent: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <Meta memory={memory} accent={accent} />
      <Title className="mt-3 text-4xl sm:text-5xl" accent={accent}>
        {memory.title}
      </Title>
      {memory.description && <p className="mt-4 text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
    </div>
  );
}

