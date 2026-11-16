"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { MemoryDTO } from "@/lib/types";
import { WatercolorBlob } from "@/components/ui/Watercolor";
import { Media } from "./Media";
import { gsap, ScrollTrigger, useScrollFx } from "./useScrollFx";

import { Meta, NoMedia, Tilt, Title, type P } from "./parts";
import { Bubbles, Carousel3D, Deck, NavArrows, Scrapbook, Storybook, useSideNav } from "./presentations2";

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
  // pasar de una toma a otra hacia los lados: lleva el scroll a la posición de esa toma
  const goShot = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const k = Math.max(0, Math.min(shots.length - 1, i));
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((k + 0.5) / shots.length) * span, behavior: "smooth" });
  };
  const activeRef = useRef(0);
  activeRef.current = active;
  useSideNav(ref, () => goShot(activeRef.current - 1), () => goShot(activeRef.current + 1));
  if (!shots.length) return <NoMedia memory={memory} accent={accent} />;
  const current = shots[active];
  return (
    <section ref={ref} className="relative" style={{ height: `${Math.max(1, shots.length) * 100 + 20}vh` }}>
      <div className="film-bars sticky top-0 h-[100svh] min-h-[520px] overflow-hidden bg-bosque-900">
        {shots.map((m, i) => (
          <motion.div
            key={m.id}
            className={m.kind === "VIDEO" ? "absolute inset-x-0 bottom-[6vh] top-[6vh]" : "absolute inset-0"}
            style={{ zIndex: i === active ? 2 : 1, pointerEvents: i === active ? "auto" : "none" }}
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.08, filter: i === active ? "blur(0px)" : "blur(6px)" }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            aria-hidden={i !== active}
          >
            <div className={`h-full w-full ${i === active && m.kind !== "VIDEO" ? "jq-kenburns" : ""}`} style={{ animationDirection: i % 2 ? "reverse" : "normal" }}>
              {Math.abs(i - active) <= 1 && <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full" sizes="100vw" fill />}
            </div>
          </motion.div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bosque-900/85 via-transparent to-bosque-900/25" />
        <div className={`sub pointer-events-none absolute inset-x-0 z-[3] mx-auto max-w-5xl px-6 text-papel transition-[bottom] duration-700 ${current?.kind === "VIDEO" && active > 0 ? "bottom-[17vh]" : "bottom-[12vh]"}`}>
          <Meta memory={memory} accent={accent} light />
          <motion.div initial={false} animate={{ scale: active === 0 ? 1 : 0.62 }} style={{ transformOrigin: "left bottom" }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
            <Title className="mt-3 text-5xl drop-shadow-lg sm:text-7xl">{memory.title}</Title>
          </motion.div>
          <AnimatePresence initial={false}>
            {memory.description && active === 0 && (
              <motion.p key="d" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 max-w-2xl overflow-hidden text-lg font-semibold leading-relaxed text-papel/90 sm:text-xl">
                {memory.description}
              </motion.p>
            )}
          </AnimatePresence>
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
            {active < shots.length - 1 && <p className="mt-2 font-ui text-xs font-bold opacity-70">baja o desliza →</p>}
          </div>
        )}
        {shots.length > 1 && (
          <>
            {active > 0 && (
              <button onClick={() => goShot(active - 1)} className="absolute left-2 top-1/2 z-[4] grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border-2 border-papel/70 bg-tinta/30 text-3xl font-bold text-papel backdrop-blur transition hover:scale-110 sm:left-5 sm:h-14 sm:w-14" aria-label="Anterior">
                ‹
              </button>
            )}
            {active < shots.length - 1 && (
              <button onClick={() => goShot(active + 1)} className="absolute right-2 top-1/2 z-[4] grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border-2 border-papel/70 bg-tinta/30 text-3xl font-bold text-papel backdrop-blur transition hover:scale-110 sm:right-5 sm:h-14 sm:w-14" aria-label="Siguiente">
                ›
              </button>
            )}
          </>
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
              style={{ zIndex: i === active ? 2 : 1, pointerEvents: i === active ? "auto" : "none" }}
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
  SCRAPBOOK: 12,
  CAROUSEL: 999,
  DECK: 999,
  STORYBOOK: 999,
  BUBBLES: 9,
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
    case "SCRAPBOOK":
      return <Scrapbook {...props} />;
    case "CAROUSEL":
      return <Carousel3D {...props} />;
    case "DECK":
      return <Deck {...props} />;
    case "STORYBOOK":
      return <Storybook {...props} />;
    case "BUBBLES":
      return <Bubbles {...props} />;
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

  if (!pinned) return <SwipeReel items={items} memory={memory} accent={accent} ratio={ratio} />;

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

/** Celular o pocos archivos: carrusel que se desliza hacia los lados, con puntos y flechas. */
function SwipeReel({ items, memory, accent, ratio }: { items: MemoryDTO["media"]; memory: MemoryDTO; accent: string; ratio: (m: MemoryDTO["media"][number]) => number }) {
  const track = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const onScroll = () => {
    const t = track.current;
    if (!t) return;
    const cards = Array.from(t.children) as HTMLElement[];
    const center = t.scrollLeft + t.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => {
      if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - center) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - center)) best = i;
    });
    setCur(best);
  };
  const go = (i: number) => {
    const t = track.current;
    const c = t?.children[Math.max(0, Math.min(items.length - 1, i))] as HTMLElement | undefined;
    if (t && c) t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
  };
  return (
    <section className="pb-20">
      <div className="mx-auto flex max-w-5xl items-end justify-between gap-3 px-5">
        <p className="font-ui text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Más de «{memory.title}» · {items.length} {items.length === 1 ? "archivo" : "archivos"}
        </p>
        {items.length > 1 && <NavArrows onPrev={() => go(cur - 1)} onNext={() => go(cur + 1)} />}
      </div>
      <div ref={track} onScroll={onScroll} className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[8vw] pb-6 pt-2 sm:px-[max(1.25rem,calc(50vw-28rem))]">
        {items.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 50, rotate: i % 2 ? 6 : -6 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 140, damping: 16, delay: Math.min(i, 3) * 0.06 }}
            className="relative w-[84vw] shrink-0 snap-center rounded-[1.6rem] bg-papel p-2 shadow-lift sm:w-[min(26rem,60vw)]"
          >
            <Media media={m} gallery={memory.media} galleryTitle={memory.title} className="w-full rounded-[1.2rem]" style={{ aspectRatio: Math.min(1.5, Math.max(0.7, ratio(m))) }} sizes="(min-width: 640px) 26rem, 84vw" />
            {m.caption && <p className="truncate px-2 pb-1 pt-2 text-center font-heading font-bold text-tinta-soft">{m.caption}</p>}
          </motion.div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {items.map((m, i) => (
            <span key={m.id} className="h-2 rounded-full transition-all duration-300" style={{ width: i === cur ? 24 : 8, background: i === cur ? accent : "#21372B33" }} />
          ))}
        </div>
      )}
    </section>
  );
}
