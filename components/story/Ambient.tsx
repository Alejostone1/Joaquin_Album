"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { PteroArt, StegoArt, TriceArt } from "@/components/ui/DinoArt";
import { FernLeaf, Footprint } from "@/components/ui/Watercolor";
import { gsap, useScrollFx } from "./useScrollFx";

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const LEAF = "M12 2C6 6 3 12 6 20c1 2 4 2 6 0 7-6 6-13 0-18z";
const PETAL = "M12 3c4 3 6 8 3 13-1 2-5 2-6 0-3-5-1-10 3-13z";

/** Hojas, pétalos, mariposas y luciérnagas que flotan detrás del contenido. */
export function AmbientLayer({ accent }: { accent: string }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => setCount(window.innerWidth < 640 ? 7 : 14), []);
  const items = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: count }, (_, i) => ({
      left: r() * 100,
      size: 14 + r() * 22,
      dur: 16 + r() * 16,
      delay: -r() * 30,
      sway: 30 + r() * 70,
      spin: (r() > 0.5 ? 1 : -1) * (180 + r() * 360),
      kind: i % 3 === 0 ? "petal" : "leaf",
      tone: ["#7FB86F", "#A8C3A0", "#2BA36B", "#FFB7CF", "#FFC93C", "#FF8A7A"][Math.floor(r() * 6)],
    }));
  }, [count]);
  const flies = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: Math.round(count * 1.2) }, () => ({ left: r() * 100, top: r() * 100, d: 3 + r() * 4, delay: -r() * 6 }));
  }, [count]);
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {items.map((it, i) => (
        <span
          key={i}
          className="jq-fall absolute -top-12"
          style={{ left: `${it.left}%`, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s`, ["--sway" as string]: `${it.sway}px`, ["--spin" as string]: `${it.spin}deg` }}
        >
          <svg viewBox="0 0 24 24" width={it.size} height={it.size}>
            <path d={it.kind === "petal" ? PETAL : LEAF} fill={it.kind === "leaf" && i % 4 === 0 ? accent : it.tone} opacity={0.55} />
            {it.kind === "leaf" && <path d="M12 3c-1 6-1 11 0 17" stroke="#21372B" strokeOpacity=".2" fill="none" />}
          </svg>
        </span>
      ))}
      {flies.map((f, i) => (
        <span key={`f${i}`} className="jq-glow absolute h-1.5 w-1.5 rounded-full bg-sol" style={{ left: `${f.left}%`, top: `${f.top}%`, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }} />
      ))}
      {count > 0 && (
        <>
          <Butterfly color="#FF8A7A" path="jq-fly-a" />
          <Butterfly color="#8FD3F4" path="jq-fly-b" />
        </>
      )}
    </div>
  );
}

function Butterfly({ color, path }: { color: string; path: string }) {
  return (
    <span className={`${path} absolute left-0 top-0`}>
      <svg viewBox="0 0 40 30" width={34} height={26}>
        <g className="jq-flap" style={{ transformOrigin: "20px 15px" }}>
          <path d="M20 15C14 2 2 2 4 12c1 5 8 6 16 3z" fill={color} opacity=".85" />
          <path d="M20 15C26 2 38 2 36 12c-1 5-8 6-16 3z" fill={color} opacity=".85" />
          <path d="M20 15c-5 4-9 10-5 12 3 1 5-5 5-12zM20 15c5 4 9 10 5 12-3 1-5-5-5-12z" fill={color} opacity=".6" />
        </g>
        <rect x="19" y="8" width="2" height="15" rx="1" fill="#21372B" />
      </svg>
    </span>
  );
}

/** Barra de progreso de la historia: un sendero de huellas con un dinosaurio que camina. */
export function ProgressTrail({ accent }: { accent: string }) {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const left = useTransform(p, (v) => `calc(${(v * 100).toFixed(2)}% - 14px)`);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-7" aria-hidden>
      <div className="absolute inset-x-0 top-0 h-1.5 bg-tinta/10" />
      <motion.div className="absolute left-0 top-0 h-1.5 origin-left rounded-r-full" style={{ scaleX: p, width: "100%", background: accent }} />
      <motion.div className="absolute top-0.5 w-7" style={{ left }}>
        <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.45, repeat: Infinity }}>
          <StegoArt className="w-7 drop-shadow" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Separador entre capítulos: pasto que se mece, huellas que aparecen y un dinosaurio que cruza. */
export function ChapterDivider({ accent, index }: { accent: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollFx(ref, (el) => {
    gsap.fromTo(el.querySelector(".runner"), { xPercent: -30, x: "-20vw" }, { x: "105vw", xPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
  });
  const Art = index % 3 === 0 ? TriceArt : index % 3 === 1 ? StegoArt : PteroArt;
  return (
    <div ref={ref} className="relative h-[34vh] min-h-[200px] overflow-hidden" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center gap-6 sm:gap-10">
        {Array.from({ length: 7 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 2.2 }}
            whileInView={{ opacity: 0.85, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 400, damping: 14 }}
            style={{ rotate: i % 2 ? 14 : -14, translateY: i % 2 ? 14 : -6 }}
          >
            <Footprint className="h-7 w-7 sm:h-9 sm:w-9" color={i % 2 ? accent : "#7A8B4A"} />
          </motion.span>
        ))}
      </div>
      <div className={`runner absolute bottom-6 w-28 sm:w-40 ${index % 3 === 2 ? "bottom-[45%]" : ""}`}>
        <div className="jq-bob">
          <Art className="w-full" />
        </div>
      </div>
      <svg className="absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 1200 80" preserveAspectRatio="none">
        <path className="jq-grass" d="M0 80 L0 46 Q 60 20 120 44 T 240 40 T 360 46 T 480 38 T 600 46 T 720 40 T 840 46 T 960 38 T 1080 46 T 1200 40 L1200 80Z" fill={accent} opacity=".18" />
        <path className="jq-grass jq-grass-2" d="M0 80 L0 56 Q 80 34 160 54 T 320 52 T 480 56 T 640 50 T 800 56 T 960 50 T 1120 56 L1200 54 L1200 80Z" fill="#7FB86F" opacity=".25" />
      </svg>
    </div>
  );
}

/** Cortina de hojas que se abre al entrar a la historia (una vez por visita). */
export function Curtain() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (reduce) return;
    try {
      if (sessionStorage.getItem("jq_curtain")) return;
      sessionStorage.setItem("jq_curtain", "1");
    } catch {
      /* noop */
    }
    setShow(true);
    const id = setTimeout(() => setShow(false), 1900);
    return () => clearTimeout(id);
  }, [reduce]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0, transition: { delay: 0.9, duration: 0.2 } }} aria-hidden>
          {[0, 1].map((side) => (
            <motion.div
              key={side}
              className={`absolute inset-y-0 w-1/2 overflow-hidden ${side ? "right-0 bg-[#3E7D52]" : "left-0 bg-[#2F6B45]"}`}
              initial={{ x: 0 }}
              exit={{ x: side ? "105%" : "-105%", transition: { duration: 1, ease: [0.7, 0, 0.2, 1] } }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <FernLeaf key={i} className="absolute h-72 w-36 opacity-70" color={i % 2 ? "#8FCB6E" : "#BDECD3"} style={{ [side ? "left" : "right"]: `${-30 + i * 12}%`, top: `${i * 16 - 10}%`, rotate: `${(side ? -1 : 1) * (40 + i * 18)}deg` }} />
              ))}
            </motion.div>
          ))}
          <motion.div className="absolute inset-0 grid place-items-center" exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.5 } }}>
            <BubbleWord text="JOAQUÍN" className="text-[clamp(3rem,12vw,8rem)] drop-shadow-xl" delay={0.15} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
