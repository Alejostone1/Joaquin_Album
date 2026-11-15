"use client";

import { motion, useReducedMotion } from "framer-motion";

const DEFAULT_COLORS = ["#2BB8E8", "#FF7A45", "#FF8FC4", "#3CC46E", "#FFC93C", "#1FB5B0", "#FF6F91", "#9B7BE0"];

type Props = {
  text: string;
  colors?: string[];
  className?: string;
  /** retraso antes de que las letras salten */
  delay?: number;
  animate?: boolean;
  as?: "h1" | "h2" | "span";
};

/** Palabra en letras burbuja de colores — la firma tipográfica del proyecto. */
export function BubbleWord({ text, colors = DEFAULT_COLORS, className = "", delay = 0, animate = true, as = "span" }: Props) {
  const reduce = useReducedMotion();
  const Tag = as;
  const letters = Array.from(text);
  return (
    <Tag className={`bubble-word ${className}`} aria-label={text}>
      {letters.map((l, i) =>
        l === " " ? (
          <span key={i} className="inline-block w-[0.3em]" aria-hidden />
        ) : (
          <motion.span
            key={i}
            aria-hidden
            data-l={l}
            className="bubble-letter"
            style={{ ["--c" as string]: colors[i % colors.length] }}
            initial={animate && !reduce ? { y: "60%", scaleY: 0.2, scaleX: 1.3, opacity: 0 } : false}
            animate={{ y: 0, scaleY: 1, scaleX: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 13, mass: 0.9, delay: delay + i * 0.085 }}
            whileHover={reduce ? undefined : { y: "-12%", rotate: i % 2 ? 6 : -6, transition: { type: "spring", stiffness: 600, damping: 10 } }}
          >
            <span className="fill">{l}</span>
          </motion.span>
        ),
      )}
    </Tag>
  );
}
