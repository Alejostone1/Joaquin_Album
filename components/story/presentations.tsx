"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import type { MemoryDTO } from "@/lib/types";
import { WatercolorBlob } from "@/components/ui/Watercolor";
import { Media } from "./Media";
import { gsap, ScrollTrigger, useScrollFx } from "./useScrollFx";

type P = { memory: MemoryDTO; accent: string; index: number };

function Meta({ memory, accent, light = false }: { memory: MemoryDTO; accent: string; light?: boolean }) {
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
      {memory.tags.map((t) => (
        <span key={t} className={`chip ${light ? "bg-white/15" : "bg-tinta/5"}`}>
          #{t}
        </span>
      ))}
    </div>
  );
}

function Title({ children, className = "", accent }: { children: string; className?: string; accent?: string }) {
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

function NoMedia({ memory, accent }: { memory: MemoryDTO; accent: string }) {
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

// 1 ——— Cine: una película con todas las fotos y videos (una toma por pantalla)
export function Cinematic({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const shots = memory.media;
  const [active, setActive] = useState(0);
  useScrollFx(
    ref,
    (el) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setActive(Math.min(shots.length - 1, Math.floor(self.progress * shots.length * 0.9999))),
      });
      gsap.from(el.querySelectorAll(".sub > *"), { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 45%" } });
    },
    [shots.length],
  );
  if (!shots.length) return <NoMedia memory={memory} accent={accent} />;
  const current = shots[active];
  return (
    <section ref={ref} className="relative" style={{ height: `${Math.max(1, shots.length) * 100 + 20}vh` }}>
      <div className="film-bars sticky top-0 h-[100svh] min-h-[520px] overflow-hidden bg-bosque-900">
        {shots.map((m, i) => (
          <motion.div
            key={m.id}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.08, filter: i === active ? "blur(0px)" : "blur(6px)" }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            aria-hidden={i !== active}
          >
            <div className={`h-full w-full ${i === active ? "jq-kenburns" : ""}`} style={{ animationDirection: i % 2 ? "reverse" : "normal" }}>
              {Math.abs(i - active) <= 1 && <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full" sizes="100vw" fill />}
            </div>
          </motion.div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bosque-900/85 via-transparent to-bosque-900/25" />
        <div className="sub pointer-events-none absolute inset-x-0 bottom-[12vh] z-[3] mx-auto max-w-5xl px-6 text-papel">
          <Meta memory={memory} accent={accent} light />
          <Title className="mt-3 text-5xl drop-shadow-lg sm:text-7xl">{memory.title}</Title>
          {memory.description && <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-papel/90 sm:text-xl">{memory.description}</p>}
          {current?.caption && (
            <motion.p key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 inline-block rounded-full bg-papel/15 px-4 py-1.5 font-heading text-lg font-bold">
              {current.caption}
            </motion.p>
          )}
        </div>
        {shots.length > 1 && (
          <div className="pointer-events-none absolute right-6 top-[11vh] z-[3] text-right text-papel">
            <p className="font-display text-4xl font-semibold tabular-nums">
              {String(active + 1).padStart(2, "0")}
              <span className="text-xl opacity-60"> / {String(shots.length).padStart(2, "0")}</span>
            </p>
            <div className="mt-2 flex justify-end gap-1">
              {shots.map((m, i) => (
                <span key={m.id} className="h-1.5 rounded-full transition-all duration-500" style={{ width: i === active ? 28 : 8, background: i <= active ? accent : "rgba(255,252,245,.35)" }} />
              ))}
            </div>
            {active < shots.length - 1 && <p className="mt-2 font-ui text-xs font-bold opacity-70">sigue bajando ↓</p>}
          </div>
        )}
      </div>
    </section>
  );
}

// 2 ——— Parallax: capas a distintas velocidades
export function Parallax({ memory, accent, index }: P) {
  const ref = useRef<HTMLElement>(null);
  useScrollFx(ref, (el) => {
    const st = { trigger: el, start: "top bottom", end: "bottom top", scrub: true };
    gsap.fromTo(el.querySelector(".l-back"), { yPercent: 30 }, { yPercent: -40, ease: "none", scrollTrigger: st });
    gsap.fromTo(el.querySelector(".l-photo"), { yPercent: 10 }, { yPercent: -10, ease: "none", scrollTrigger: st });
    gsap.fromTo(el.querySelector(".l-card"), { yPercent: 40 }, { yPercent: -30, ease: "none", scrollTrigger: st });
  });
  const [main] = memory.media;
  if (!main) return <NoMedia memory={memory} accent={accent} />;
  const flip = index % 2 === 1;
  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <WatercolorBlob color={accent} seed={index + 3} className={`l-back absolute top-10 h-[70%] w-[70%] ${flip ? "right-0" : "left-0"}`} opacity={0.35} />
      <div className={`relative grid items-center gap-8 md:grid-cols-12 ${flip ? "md:[direction:rtl]" : ""}`}>
        <div className="l-photo md:col-span-7 [direction:ltr]">
          <Tilt max={5}>
            <Media gallery={memory.media} galleryTitle={memory.title} media={main} className="aspect-[4/5] w-full rounded-[2.2rem] shadow-lift sm:aspect-[4/3]" />
          </Tilt>
        </div>
        <div className="l-card sticker relative p-7 md:col-span-5 md:-mx-16 [direction:ltr]">
          <Meta memory={memory} accent={accent} />
          <Title className="mt-3 text-4xl sm:text-5xl" accent={accent}>
            {memory.title}
          </Title>
          {memory.description && <p className="mt-4 text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
        </div>
      </div>
    </section>
  );
}

// 3 ——— Zoom suave: la foto crece hasta ocupar la pantalla
export function Zoom({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  useScrollFx(ref, (el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } });
    tl.fromTo(el.querySelector(".zframe"), { scale: 0.56, borderRadius: "48px" }, { scale: 1, borderRadius: "0px", ease: "none" }, 0);
    tl.fromTo(el.querySelector(".zimg"), { scale: 1.25 }, { scale: 1, ease: "none" }, 0);
    tl.fromTo(el.querySelector(".ztext"), { opacity: 0, y: 60 }, { opacity: 1, y: 0, ease: "power1.out" }, 0.55);
  });
  const [main] = memory.media;
  if (!main) return <NoMedia memory={memory} accent={accent} />;
  return (
    <section ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <div className="zframe relative h-full w-full overflow-hidden will-change-transform">
          <div className="zimg h-full w-full">
            <Media gallery={memory.media} galleryTitle={memory.title} media={main} className="h-full w-full" sizes="100vw" ambient fill />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bosque-900/70 via-transparent to-transparent" />
          <div className="ztext pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-6 pb-14 text-papel">
            <Meta memory={memory} accent={accent} light />
            <Title className="mt-3 text-5xl sm:text-7xl">{memory.title}</Title>
            {memory.description && <p className="mt-3 max-w-2xl text-lg font-semibold text-papel/90">{memory.description}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

// 4 ——— Editorial: composición de revista con letra capital
export function Editorial({ memory, accent, index }: P) {
  const [main, second] = memory.media;
  const desc = memory.description ?? "";
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-12">
          <Meta memory={memory} accent={accent} />
          <Title className="mt-4 text-[clamp(3rem,9vw,7.5rem)] tracking-tight" accent={accent}>
            {memory.title}
          </Title>
        </div>
        {main && (
          <div className={`relative md:col-span-7 ${index % 2 ? "md:order-2" : ""}`}>
            <div className="absolute -inset-3 translate-x-5 translate-y-5 rounded-[2rem]" style={{ background: `${accent}33` }} />
            <Tilt>
              <Media gallery={memory.media} galleryTitle={memory.title} media={main} className="relative aspect-[4/5] rounded-[2rem] shadow-lift" />
            </Tilt>
            {main.caption && <p className="mt-3 font-ui text-sm font-bold text-tinta-mute">{main.caption}</p>}
          </div>
        )}
        <div className="flex flex-col justify-end gap-8 md:col-span-5">
          {desc && (
            <p className="dropcap text-xl leading-relaxed text-tinta-soft" style={{ ["--dc" as string]: accent }}>
              {desc}
            </p>
          )}
          {second && <Media gallery={memory.media} galleryTitle={memory.title} media={second} className="aspect-[4/3] w-4/5 self-end rounded-[1.6rem] border-[6px] border-papel shadow-soft" sizes="400px" />}
        </div>
      </motion.div>
    </section>
  );
}

// 5 ——— Superpuestas: polaroids que se abren en abanico
export function Overlap({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media.slice(0, 5);
  useScrollFx(ref, (el) => {
    const cards = gsap.utils.toArray<HTMLElement>(".pola", el);
    const n = cards.length;
    cards.forEach((c, i) => {
      const off = i - (n - 1) / 2;
      gsap.fromTo(
        c,
        { x: 0, y: 30, rotate: (i % 2 ? 1 : -1) * 3 },
        { x: () => off * Math.min(window.innerWidth * 0.2, 250), y: Math.abs(off) * 24, rotate: off * 7, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 75%", end: "center 55%", scrub: 0.8 } },
      );
    });
  }, [items.length]);
  if (!items.length) return <NoMedia memory={memory} accent={accent} />;
  return (
    <section ref={ref} className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Meta memory={memory} accent={accent} />
        <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
          {memory.title}
        </Title>
      </div>
      <div className="relative mx-auto mt-14 grid h-[min(70vw,460px)] max-w-5xl place-items-center">
        {items.map((m, i) => (
          <div key={m.id} className="pola absolute w-[min(52vw,300px)] rounded-xl bg-papel p-3 pb-12 shadow-lift transition-[box-shadow] hover:z-10" style={{ zIndex: i }}>
            <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="aspect-square rounded-md" sizes="320px" />
            {m.caption && <p className="absolute inset-x-0 bottom-3 truncate px-4 text-center font-heading text-base font-bold text-tinta-soft">{m.caption}</p>}
          </div>
        ))}
      </div>
      {memory.description && <p className="mx-auto mt-14 max-w-2xl text-center text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
    </section>
  );
}

// 6 ——— Collage dinámico
export function Collage({ memory, accent }: P) {
  const items = memory.media.slice(0, 9);
  if (!items.length) return <NoMedia memory={memory} accent={accent} />;
  const spans = ["sm:col-span-2 sm:row-span-2", "", "sm:row-span-2", "", "sm:col-span-2", "", "", "sm:col-span-2", ""];
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Meta memory={memory} accent={accent} />
          <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
            {memory.title}
          </Title>
        </div>
        {memory.description && <p className="max-w-md text-lg text-tinta-soft">{memory.description}</p>}
      </div>
      <div className="grid auto-rows-[38vw] grid-cols-2 gap-3 sm:auto-rows-[180px] sm:grid-cols-4 sm:gap-4 [grid-auto-flow:dense]">
        {items.map((m, i) => (
          <motion.div
            key={m.id}
            className={spans[i % spans.length]}
            initial={{ opacity: 0, scale: 0.6, rotate: i % 2 ? 6 : -6 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ type: "spring", stiffness: 180, damping: 16, delay: (i % 4) * 0.08 }}
            whileHover={{ scale: 1.03, rotate: i % 2 ? 1.5 : -1.5, zIndex: 5 }}
          >
            <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full rounded-[1.4rem] shadow-soft" sizes="(min-width: 640px) 30vw, 50vw" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// 7 ——— Secuencia: las fotos se suceden mientras bajas
export function Sequence({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media.slice(0, 8);
  const [active, setActive] = useState(0);
  useScrollFx(ref, (el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setActive(Math.min(items.length - 1, Math.floor(self.progress * items.length * 0.999))),
    });
  }, [items.length]);
  if (!items.length) return <NoMedia memory={memory} accent={accent} />;
  return (
    <section ref={ref} className="relative" style={{ height: `${Math.max(2, items.length) * 85}vh` }}>
      <div className="sticky top-0 grid h-[100svh] items-center overflow-hidden px-5 md:grid-cols-12 md:gap-10 md:px-12">
        <div className="relative z-10 md:col-span-4">
          <Meta memory={memory} accent={accent} />
          <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
            {memory.title}
          </Title>
          {memory.description && <p className="mt-4 text-lg text-tinta-soft">{memory.description}</p>}
          <div className="mt-6 flex gap-2" aria-hidden>
            {items.map((m, i) => (
              <span key={m.id} className="h-2.5 rounded-full transition-all duration-500" style={{ width: i === active ? 36 : 10, background: i === active ? accent : "#21372B22" }} />
            ))}
          </div>
        </div>
        <div className="relative mt-6 h-[52svh] md:col-span-8 md:mt-0 md:h-[78svh]">
          {items.map((m, i) => (
            <motion.div
              key={m.id}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : i < active ? 0.92 : 1.06, rotate: i === active ? 0 : i < active ? -3 : 3, x: i < active ? -40 : i > active ? 40 : 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full rounded-[2rem] shadow-lift" sizes="(min-width: 768px) 60vw, 100vw" />
              {m.caption && <p className="absolute bottom-4 left-4 rounded-full bg-papel/90 px-4 py-1.5 font-ui text-sm font-bold">{m.caption}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 8 ——— Revelado progresivo
export function Reveal({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  useScrollFx(ref, (el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 80%", end: "center 45%", scrub: 0.7 } });
    tl.fromTo(el.querySelector(".rv"), { clipPath: "inset(46% 46% 46% 46% round 40px)", filter: "blur(14px) saturate(0.4)" }, { clipPath: "inset(0% 0% 0% 0% round 32px)", filter: "blur(0px) saturate(1)", ease: "none" });
    gsap.from(el.querySelectorAll(".word"), { opacity: 0.08, stagger: 0.04, ease: "none", scrollTrigger: { trigger: el.querySelector(".words"), start: "top 85%", end: "bottom 60%", scrub: true } });
  });
  const [main] = memory.media;
  if (!main) return <NoMedia memory={memory} accent={accent} />;
  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <div className="text-center">
        <Meta memory={memory} accent={accent} />
        <Title className="mx-auto mt-3 max-w-4xl text-4xl sm:text-6xl" accent={accent}>
          {memory.title}
        </Title>
      </div>
      <div className="rv mt-10 overflow-hidden rounded-[2rem]">
        <Media gallery={memory.media} galleryTitle={memory.title} media={main} className="aspect-[16/10] w-full" sizes="100vw" />
      </div>
      {memory.description && (
        <p className="words mx-auto mt-10 max-w-3xl text-center font-heading text-2xl font-semibold leading-snug sm:text-3xl">
          {memory.description.split(" ").map((w, i) => (
            <span key={i} className="word">
              {w}{" "}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

// 9 ——— Máscara: se descubre a través de un huevo
const EGG_MASK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'><path d='M50 2C24 2 6 44 6 72c0 26 20 46 44 46s44-20 44-46C94 44 76 2 50 2z'/></svg>\")";

export function Mask({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  useScrollFx(ref, (el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } });
    tl.fromTo(el.querySelector(".mk"), { "--ms": "34%" }, { "--ms": "520%", ease: "power1.in" }, 0);
    tl.fromTo(el.querySelector(".mk-shell"), { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.6, ease: "power1.in" }, 0);
    tl.fromTo(el.querySelector(".mk-text"), { opacity: 0, y: 50 }, { opacity: 1, y: 0 }, 0.6);
  });
  const [main] = memory.media;
  if (!main) return <NoMedia memory={memory} accent={accent} />;
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: EGG_MASK,
    maskImage: EGG_MASK,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center 55%",
    maskPosition: "center 55%",
    WebkitMaskSize: "auto var(--ms)",
    maskSize: "auto var(--ms)",
    ["--ms" as string]: "34%",
  };
  return (
    <section ref={ref} className="relative h-[230vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mk-shell pointer-events-none absolute inset-0 grid place-items-center">
          <WatercolorBlob color={accent} seed={21} className="h-[70vh] w-[70vh]" opacity={0.3} />
        </div>
        <div className="mk absolute inset-0" style={maskStyle}>
          <Media gallery={memory.media} galleryTitle={memory.title} media={main} className="h-full w-full" sizes="100vw" ambient fill />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bosque-900/70 via-transparent to-transparent" />
        </div>
        <div className="mk-text pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-6 pb-14 text-papel">
          <Meta memory={memory} accent={accent} light />
          <Title className="mt-3 text-5xl drop-shadow-lg sm:text-7xl">{memory.title}</Title>
          {memory.description && <p className="mt-3 max-w-2xl text-lg font-semibold text-papel/90">{memory.description}</p>}
        </div>
      </div>
    </section>
  );
}

/** Cuántos archivos muestra cada estilo; el resto aparece en la cinta que sigue. */
const SHOWN: Record<MemoryDTO["presentation"], number> = {
  CINEMATIC: 999,
  PARALLAX: 1,
  ZOOM: 1,
  EDITORIAL: 2,
  OVERLAP: 5,
  COLLAGE: 9,
  SEQUENCE: 8,
  REVEAL: 1,
  MASK: 1,
};

function Presentation(props: P) {
  switch (props.memory.presentation) {
    case "CINEMATIC":
      return <Cinematic {...props} />;
    case "PARALLAX":
      return <Parallax {...props} />;
    case "ZOOM":
      return <Zoom {...props} />;
    case "EDITORIAL":
      return <Editorial {...props} />;
    case "OVERLAP":
      return <Overlap {...props} />;
    case "COLLAGE":
      return <Collage {...props} />;
    case "SEQUENCE":
      return <Sequence {...props} />;
    case "REVEAL":
      return <Reveal {...props} />;
    case "MASK":
      return <Mask {...props} />;
  }
}

export function MemoryView(props: P) {
  const rest = props.memory.media.slice(SHOWN[props.memory.presentation]);
  return (
    <>
      <Presentation {...props} />
      {rest.length > 0 && <MediaReel items={rest} memory={props.memory} accent={props.accent} />}
    </>
  );
}

const FILM_HOLES = "repeating-linear-gradient(90deg, transparent 0 14px, rgba(255,252,245,.85) 14px 26px, transparent 26px 40px)";

/**
 * Cinta de película con el resto de fotos y videos del recuerdo.
 * Escritorio: se desliza en horizontal mientras haces scroll. Celular: aparecen una a una.
 */
export function MediaReel({ items, memory, accent }: { items: MemoryDTO["media"]; memory: MemoryDTO; accent: string }) {
  const ref = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const pinned = desktop && items.length >= 3;
  useScrollFx(
    ref,
    (el) => {
      if (!pinned) return;
      const track = el.querySelector<HTMLElement>(".reel-track")!;
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 120);
      const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector(".reel-pin"), start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true } });
      tl.to(track, { x: () => -distance(), ease: "none" }, 0);
      tl.to(el.querySelectorAll(".reel-inner"), { xPercent: 12, ease: "none" }, 0);
    },
    [pinned, items.length],
  );

  const ratio = (m: MemoryDTO["media"][number]) => (m.width && m.height ? m.width / m.height : m.kind === "VIDEO" ? 9 / 16 : 4 / 5);

  if (!pinned) {
    return (
      <section ref={ref} className="mx-auto max-w-5xl px-5 pb-24">
        <p className="mb-5 text-center font-ui text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
          Más de «{memory.title}» · {items.length} {items.length === 1 ? "archivo" : "archivos"}
        </p>
        <div className={`grid gap-5 ${items.length === 1 ? "mx-auto max-w-md" : "sm:grid-cols-2"}`}>
          {items.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 60, rotate: i % 2 ? 5 : -5, clipPath: "inset(18% 18% 18% 18% round 28px)" }}
              whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 1.5 : -1.5, clipPath: "inset(0% 0% 0% 0% round 28px)" }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              className="rounded-[1.8rem] bg-papel p-2.5 shadow-lift"
            >
              <Media media={m} gallery={memory.media} galleryTitle={memory.title} className="w-full rounded-[1.4rem]" style={{ aspectRatio: Math.min(1.6, Math.max(0.65, ratio(m))) }} sizes="(min-width: 640px) 45vw, 92vw" />
              {m.caption && <p className="px-2 pb-1 pt-2 text-center font-heading font-bold text-tinta-soft">{m.caption}</p>}
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative">
      <div className="reel-pin relative flex h-[100svh] flex-col justify-center overflow-hidden bg-bosque-900">
        <div className="pointer-events-none absolute inset-x-0 top-[7vh] h-6 opacity-40" style={{ backgroundImage: FILM_HOLES }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-[7vh] h-6 opacity-40" style={{ backgroundImage: FILM_HOLES }} />
        <div className="absolute left-8 top-[12vh] z-10 max-w-sm text-papel">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
            Más de este recuerdo
          </p>
          <p className="mt-1 font-heading text-3xl font-extrabold leading-tight">{memory.title}</p>
          <p className="mt-1 font-ui text-sm font-bold text-papel/70">{items.length} fotos y videos · sigue bajando →</p>
        </div>
        <div className="reel-track flex items-center gap-10 pl-[34vw] pr-[12vw] will-change-transform">
          {items.map((m, i) => (
            <motion.div
              key={m.id}
              className="relative shrink-0 rounded-[1.6rem] bg-papel p-2.5 shadow-lift"
              style={{ height: i % 3 === 1 ? "50vh" : "60vh", aspectRatio: Math.min(1.6, Math.max(0.6, ratio(m))) }}
              initial={{ opacity: 0, scale: 0.75, rotate: i % 2 ? 9 : -9, y: 60 }}
              whileInView={{ opacity: 1, scale: 1, rotate: i % 2 ? 2 : -2, y: i % 3 === 1 ? 40 : 0 }}
              viewport={{ amount: 0.3 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              whileHover={{ rotate: 0, scale: 1.03 }}
            >
              <div className="h-full w-full overflow-hidden rounded-[1.2rem]">
                <div className="reel-inner h-full w-[112%] -translate-x-[6%]">
                  <Media media={m} gallery={memory.media} galleryTitle={memory.title} className="h-full w-full" sizes="60vw" />
                </div>
              </div>
              <span className="absolute -bottom-9 left-1 font-ui text-xs font-bold text-papel/60">
                {String(i + 2).padStart(2, "0")} / {String(memory.media.length).padStart(2, "0")}
                {m.caption ? ` · ${m.caption}` : ""}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
