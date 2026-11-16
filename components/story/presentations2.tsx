"use client";

import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useSpring, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PteroArt, StegoArt, TriceArt } from "@/components/ui/DinoArt";
import { EggIcon, Footprint, WatercolorBlob } from "@/components/ui/Watercolor";
import { Media } from "./Media";
import { Meta, NoMedia, Title, type P } from "./parts";
import { gsap, useScrollFx } from "./useScrollFx";

/**
 * Navegación lateral: deslizar con el dedo, el trackpad (scroll horizontal) o las flechas
 * del teclado cuando el bloque está en pantalla.
 */
export function useSideNav(ref: React.RefObject<HTMLElement | null>, prev: () => void, next: () => void, opts: { touch?: boolean } = {}) {
  const touch = opts.touch ?? true;
  const fns = useRef({ prev, next });
  fns.current = { prev, next };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // "en pantalla": el bloque cubre el centro de la ventana
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
    };
    let sx = 0;
    let sy = 0;
    let st = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      st = Date.now();
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - st < 900) {
        if (dx < 0) fns.current.next();
        else fns.current.prev();
      }
    };
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 18 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.4) return;
      e.preventDefault();
      const now = Date.now();
      if (now < lock) return;
      lock = now + 650;
      if (e.deltaX > 0) fns.current.next();
      else fns.current.prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !inView()) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      if (e.key === "ArrowRight") fns.current.next();
      if (e.key === "ArrowLeft") fns.current.prev();
    };
    if (touch) {
      el.addEventListener("touchstart", onStart, { passive: true });
      el.addEventListener("touchend", onEnd, { passive: true });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [ref, touch]);
}

export function NavArrows({ onPrev, onNext, light = false, className = "" }: { onPrev: () => void; onNext: () => void; light?: boolean; className?: string }) {
  const base = light ? "border-papel/70 bg-papel/15 text-papel hover:bg-papel/30" : "border-tinta bg-papel text-tinta shadow-[0_4px_0_#21372b] hover:-translate-y-0.5";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={onPrev} className={`grid h-11 w-11 place-items-center rounded-full border-2 text-2xl font-bold backdrop-blur transition ${base}`} aria-label="Anterior">
        ‹
      </button>
      <button onClick={onNext} className={`grid h-11 w-11 place-items-center rounded-full border-2 text-2xl font-bold backdrop-blur transition ${base}`} aria-label="Siguiente">
        ›
      </button>
    </div>
  );
}

const Counter = ({ i, n, color }: { i: number; n: number; color: string }) => (
  <span className="font-display text-2xl font-semibold tabular-nums">
    <span style={{ color }}>{String(i + 1).padStart(2, "0")}</span>
    <span className="text-base opacity-50"> / {String(n).padStart(2, "0")}</span>
  </span>
);

const ratioOf = (m: P["memory"]["media"][number]) => (m.width && m.height ? m.width / m.height : m.kind === "VIDEO" ? 9 / 16 : 4 / 5);

// 10 ——— Álbum de recortes: fotos pegadas con cinta, stickers y notas
const TAPES = ["#FFC93C", "#8FD3F4", "#FFB7CF", "#BDECD3", "#C9B6F2", "#FFB59E"];
export function Scrapbook({ memory, accent, index }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media.slice(0, 12);
  useScrollFx(
    ref,
    (el) => {
      gsap.utils.toArray<HTMLElement>(".sb-par", el).forEach((c, i) => {
        gsap.fromTo(c, { y: 40 + (i % 3) * 30 }, { y: -40 - (i % 3) * 30, ease: "none", scrollTrigger: { trigger: c, start: "top bottom", end: "bottom top", scrub: true } });
      });
    },
    [items.length],
  );
  if (!items.length) return <NoMedia memory={memory} accent={accent} />;
  const stickers = [StegoArt, TriceArt, PteroArt];
  return (
    <section ref={ref} className="relative px-3 py-20 sm:px-6 sm:py-28">
      <div
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.2rem] border-[3px] border-tinta/10 px-4 pb-14 pt-10 shadow-lift sm:px-10"
        style={{ background: "#FBF3E4", backgroundImage: "radial-gradient(rgba(33,55,43,.09) 1.4px, transparent 1.4px)", backgroundSize: "22px 22px" }}
      >
        {/* espiral del cuaderno */}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-5" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="h-4 w-4 rounded-full border-[3px] border-tinta/25 bg-papel" />
          ))}
        </div>
        <div className="relative mx-auto mt-6 max-w-3xl text-center">
          <Meta memory={memory} accent={accent} />
          <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
            {memory.title}
          </Title>
          {memory.description && (
            <motion.p
              initial={{ opacity: 0, rotate: -2, y: 20 }}
              whileInView={{ opacity: 1, rotate: -1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto mt-6 max-w-xl rounded-md bg-[#FFF7B8] px-6 py-5 text-left font-display text-xl leading-relaxed text-tinta shadow-soft"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 31px, rgba(60,155,224,.25) 31px 32px)" }}
            >
              {memory.description}
            </motion.p>
          )}
        </div>
        <div className="relative mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-14">
          {items.map((m, i) => {
            const rot = ((i * 37 + index * 11) % 13) - 6;
            const Sticker = stickers[(i + index) % stickers.length];
            const portrait = ratioOf(m) < 0.95;
            return (
              <div key={m.id} className={`sb-par relative ${i % 3 === 1 ? "sm:mt-12" : ""}`}>
                <motion.figure
                  initial={{ opacity: 0, y: -80, rotate: rot * 3, scale: 1.15 }}
                  whileInView={{ opacity: 1, y: 0, rotate: rot, scale: 1 }}
                  viewport={{ once: true, margin: "-8%" }}
                  transition={{ type: "spring", stiffness: 130, damping: 13, delay: (i % 3) * 0.12 }}
                  whileHover={{ rotate: 0, scale: 1.04, zIndex: 5 }}
                  className="relative bg-white p-2.5 pb-10 shadow-[0_10px_28px_-10px_rgba(33,55,43,.45)] sm:p-3 sm:pb-12"
                >
                  <span
                    className="absolute -top-3 left-1/2 z-[1] h-7 w-24 -translate-x-1/2 opacity-80"
                    style={{ background: TAPES[(i + index) % TAPES.length], rotate: `${-rot * 1.5}deg`, maskImage: "linear-gradient(90deg, transparent 0 3px, #000 3px calc(100% - 3px), transparent calc(100% - 3px))" }}
                    aria-hidden
                  />
                  <Media gallery={memory.media} galleryTitle={memory.title} media={m} className={`w-full ${portrait ? "aspect-[4/5]" : "aspect-square"}`} sizes="(min-width: 640px) 32vw, 46vw" />
                  <figcaption className="absolute inset-x-2 bottom-2 truncate text-center font-display text-base font-medium text-tinta-soft sm:bottom-3 sm:text-lg">{m.caption ?? ""}</figcaption>
                </motion.figure>
                {i % 4 === 1 && (
                  <motion.div initial={{ scale: 0, rotate: -40 }} whileInView={{ scale: 1, rotate: 12 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.5 }} className="pointer-events-none absolute -bottom-6 -right-4 w-16 sm:w-24" aria-hidden>
                    <Sticker className="w-full drop-shadow-md" />
                  </motion.div>
                )}
                {i % 5 === 3 && (
                  <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", delay: 0.6 }} className="pointer-events-none absolute -left-3 -top-4 w-10 sm:w-14" aria-hidden>
                    <EggIcon className="w-full -rotate-12" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
        <Footprint className="pointer-events-none absolute bottom-4 right-6 h-10 w-10 rotate-12 opacity-30" color={accent} />
      </div>
    </section>
  );
}

// 11 ——— Carrusel 3D: gira con el dedo, las flechas o al bajar
export function Carousel3D({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media.slice(0, 14);
  const n = items.length;
  const [w, setW] = useState(300);
  const angle = useMotionValue(0);
  const smooth = useSpring(angle, { stiffness: 70, damping: 18 });
  const [front, setFront] = useState(0);
  const step = 360 / Math.max(3, n);
  useEffect(() => {
    const on = () => setW(Math.min(340, Math.max(170, window.innerWidth * (window.innerWidth < 640 ? 0.52 : 0.24))));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  useEffect(
    () =>
      smooth.on("change", (a) => {
        const i = Math.round(-a / step);
        setFront(((i % n) + n) % n);
      }),
    [smooth, step, n],
  );
  // el carrusel también gira un poco al bajar
  useScrollFx(
    ref,
    (el) => {
      let last = 0;
      gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            const d = self.progress - last;
            last = self.progress;
            angle.set(angle.get() - d * 160);
          },
        },
      });
    },
    [n],
  );
  const goTo = (i: number) => {
    const target = -i * step;
    // girar por el camino más corto
    const cur = angle.get();
    const k = Math.round((cur - target) / 360);
    animate(angle, target + k * 360, { type: "spring", stiffness: 60, damping: 16 });
  };
  const next = () => goTo(Math.round(-angle.get() / step) + 1);
  const prev = () => goTo(Math.round(-angle.get() / step) - 1);
  useSideNav(ref, prev, next, { touch: false });
  if (n < 3) return <Deck memory={memory} accent={accent} index={0} />;
  const radius = Math.round(w / 2 / Math.tan(Math.PI / n) + 28);
  const cur = items[front];
  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-28">
      <WatercolorBlob color={accent} seed={14} className="absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2" opacity={0.18} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <Meta memory={memory} accent={accent} />
        <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
          {memory.title}
        </Title>
        {memory.description && <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
      </div>
      <motion.div
        className="relative mx-auto mt-10 cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ height: w * 1.35 + 40, perspective: 1300 }}
        onPan={(_, info: PanInfo) => angle.set(angle.get() + info.delta.x * 0.35)}
        onPanEnd={(_, info: PanInfo) => goTo(Math.round(-(angle.get() + info.velocity.x * 0.08) / step))}
      >
        <motion.div className="absolute left-1/2 top-4" style={{ width: w, height: w * 1.3, marginLeft: -w / 2, transformStyle: "preserve-3d", rotateY: smooth, z: -radius }}>
          {items.map((m, i) => (
            <div
              key={m.id}
              className="absolute inset-0 rounded-[1.6rem] bg-papel p-2 shadow-lift"
              style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, backfaceVisibility: "hidden" }}
              onClick={(e) => {
                if (i !== front) {
                  e.stopPropagation();
                  goTo(i + Math.round(-angle.get() / step) - front);
                }
              }}
            >
              <div className={`h-full w-full overflow-hidden rounded-[1.2rem] transition duration-500 ${i === front ? "" : "pointer-events-none brightness-[.8] saturate-[.8]"}`}>
                <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full" sizes="340px" />
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
      <div className="relative mx-auto mt-4 flex max-w-md items-center justify-between gap-4 px-5">
        <Counter i={front} n={n} color={accent} />
        <AnimatePresence mode="wait">
          <motion.p key={cur?.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="min-w-0 flex-1 truncate text-center font-heading font-bold text-tinta-soft">
            {cur?.caption ?? (cur?.kind === "VIDEO" ? "Video" : "")}
          </motion.p>
        </AnimatePresence>
        <NavArrows onPrev={prev} onNext={next} />
      </div>
      <p className="mt-3 text-center font-ui text-xs font-bold text-tinta-mute">Arrastra hacia los lados o usa las flechas</p>
    </section>
  );
}

// 12 ——— Baraja: fotos apiladas que se deslizan a un lado
export function Deck({ memory, accent, index }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media;
  const n = items.length;
  const [top, setTop] = useState(0);
  const [fly, setFly] = useState<{ id: string; dir: number } | null>(null);
  const next = () => {
    if (n < 2) return;
    setFly({ id: items[top].id, dir: 1 });
    setTop((t) => (t + 1) % n);
  };
  const prev = () => {
    if (n < 2) return;
    setFly({ id: items[(top - 1 + n) % n].id, dir: -1 });
    setTop((t) => (t - 1 + n) % n);
  };
  useSideNav(ref, prev, next, { touch: false });
  if (!n) return <NoMedia memory={memory} accent={accent} />;
  const flip = index % 2 === 1;
  const visible = Array.from({ length: Math.min(4, n) }, (_, k) => (top + k) % n);
  return (
    <section ref={ref} className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20 sm:py-28">
      <WatercolorBlob color={accent} seed={index + 9} className={`absolute top-10 h-[60%] w-[60%] ${flip ? "left-0" : "right-0"}`} opacity={0.22} />
      <div className={`relative grid items-center gap-10 md:grid-cols-12 ${flip ? "md:[direction:rtl]" : ""}`}>
        <div className="md:col-span-5 [direction:ltr]">
          <Meta memory={memory} accent={accent} />
          <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
            {memory.title}
          </Title>
          {memory.description && <p className="mt-4 text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
          {n > 1 && (
            <div className="mt-6 flex items-center gap-4">
              <Counter i={top} n={n} color={accent} />
              <NavArrows onPrev={prev} onNext={next} />
            </div>
          )}
          {n > 1 && <p className="mt-3 font-ui text-xs font-bold text-tinta-mute">Desliza la foto de arriba para ver la siguiente</p>}
        </div>
        <div className="relative md:col-span-7 [direction:ltr]">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px]">
            {visible
              .slice()
              .reverse()
              .map((idx) => {
                const depth = visible.indexOf(idx);
                return (
                  <DeckCard key={items[idx].id} memory={memory} m={items[idx]} depth={depth} isTop={depth === 0} onSwipe={(d) => (d > 0 ? prev() : next())} fly={fly?.id === items[idx].id ? fly.dir : 0} />
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckCard({ memory, m, depth, isTop, onSwipe, fly }: { memory: P["memory"]; m: P["memory"]["media"][number]; depth: number; isTop: boolean; onSwipe: (dir: number) => void; fly: number }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const controls = useDragControls();
  const tilt = ((m.id.charCodeAt(0) + m.id.charCodeAt(1)) % 9) - 4;
  return (
    <motion.div
      className="absolute inset-0 rounded-[1.8rem] bg-papel p-2.5 shadow-lift"
      style={{ x, rotate: isTop ? rotate : undefined, zIndex: 10 - depth }}
      initial={fly ? { x: fly * -420, rotate: fly * -20, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1, scale: 1 - depth * 0.05, y: depth * 18, rotate: isTop ? 0 : tilt * (depth + 0.5) }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      drag={isTop ? "x" : false}
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.9}
      onPointerDown={(e) => {
        if (!isTop) return;
        if ((e.target as HTMLElement).closest("button, input, video")) return;
        controls.start(e);
      }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 600) onSwipe(info.offset.x);
      }}
    >
      <div className="h-full w-full overflow-hidden rounded-[1.4rem]">
        <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full" sizes="(min-width: 768px) 460px, 90vw" fill />
      </div>
      {m.caption && isTop && <p className="absolute inset-x-6 bottom-6 truncate rounded-full bg-papel/90 px-4 py-1.5 text-center font-heading font-bold">{m.caption}</p>}
    </motion.div>
  );
}

// 13 ——— Libro de cuentos: páginas que se pasan
export function Storybook({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media;
  const n = items.length;
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (d: number) => {
    if (n < 2) return;
    setDir(d);
    setPage((p) => (p + d + n) % n);
  };
  useSideNav(ref, () => go(-1), () => go(1));
  if (!n) return <NoMedia memory={memory} accent={accent} />;
  const m = items[page];
  // el texto del recuerdo se reparte entre las páginas
  const sentences = (memory.description ?? "").split(/(?<=[.!?…])\s+/).filter(Boolean);
  const per = Math.max(1, Math.ceil(sentences.length / n));
  const text = sentences.slice(page * per, page * per + per).join(" ");
  return (
    <section ref={ref} className="relative px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <Meta memory={memory} accent={accent} />
        <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
          {memory.title}
        </Title>
      </div>
      <div className="relative mx-auto mt-10 max-w-5xl" style={{ perspective: 2000 }}>
        <div className="relative grid overflow-hidden rounded-[1.6rem] border-[3px] border-tinta/15 shadow-lift md:grid-cols-2" style={{ background: "#FFFBF1" }}>
          {/* lomo */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[3] hidden w-10 -translate-x-1/2 md:block" style={{ background: "linear-gradient(90deg, transparent, rgba(33,55,43,.14) 45%, rgba(33,55,43,.2) 50%, rgba(33,55,43,.14) 55%, transparent)" }} aria-hidden />
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={`t-${page}`}
              custom={dir}
              initial={{ opacity: 0, x: dir * -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * 30 }}
              transition={{ duration: 0.45 }}
              className="order-2 flex min-h-[200px] flex-col justify-center gap-4 p-7 sm:p-10 md:order-1"
            >
              <span className="font-ui text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                Página {page + 1} de {n}
              </span>
              {text ? (
                <p className={`font-display text-2xl leading-snug text-tinta sm:text-3xl ${page === 0 ? "dropcap" : ""}`} style={{ ["--dc" as string]: accent }}>
                  {text}
                </p>
              ) : (
                <p className="font-display text-2xl leading-snug text-tinta-soft sm:text-3xl">{m.caption ?? (page === 0 ? "Había una vez…" : "Y la historia sigue…")}</p>
              )}
              {text && m.caption && <p className="font-heading text-lg font-bold text-tinta-soft">— {m.caption}</p>}
            </motion.div>
          </AnimatePresence>
          <div className="relative order-1 aspect-[4/5] md:order-2 md:aspect-auto md:min-h-[520px]">
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={m.id}
                custom={dir}
                className="absolute inset-0 p-4 sm:p-6"
                style={{ transformOrigin: dir > 0 ? "left center" : "right center", backfaceVisibility: "hidden" }}
                initial={{ rotateY: dir > 0 ? 75 : -75, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir > 0 ? -95 : 95, opacity: 0 }}
                transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="h-full w-full overflow-hidden rounded-xl border-[6px] border-white shadow-soft">
                  <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full" sizes="(min-width: 768px) 45vw, 92vw" fill />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {n > 1 && (
          <div className="mt-5 flex items-center justify-center gap-4">
            <button onClick={() => go(-1)} className="btn-soft px-4 py-2 text-sm">
              ‹ Página anterior
            </button>
            <button onClick={() => go(1)} className="btn-candy px-4 py-2 text-sm">
              Pasar página ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// 14 ——— Burbujas: fotos redondas que flotan en el cielo
const SPOTS = [
  { x: 6, y: 8, s: 30 },
  { x: 62, y: 4, s: 24 },
  { x: 38, y: 30, s: 36 },
  { x: 76, y: 34, s: 22 },
  { x: 4, y: 52, s: 22 },
  { x: 58, y: 62, s: 30 },
  { x: 24, y: 70, s: 20 },
  { x: 82, y: 76, s: 18 },
  { x: 42, y: 86, s: 16 },
];
export function Bubbles({ memory, accent }: P) {
  const ref = useRef<HTMLElement>(null);
  const items = memory.media.slice(0, SPOTS.length);
  useScrollFx(
    ref,
    (el) => {
      gsap.utils.toArray<HTMLElement>(".bb", el).forEach((b, i) => {
        const speed = 0.4 + (i % 4) * 0.35;
        gsap.fromTo(b, { yPercent: 40 * speed }, { yPercent: -60 * speed, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
      gsap.fromTo(el.querySelectorAll(".cloud"), { xPercent: -10 }, { xPercent: 15, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    },
    [items.length],
  );
  if (!items.length) return <NoMedia memory={memory} accent={accent} />;
  return (
    <section ref={ref} className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, transparent, ${accent}22 18%, #DDF1FB 50%, ${accent}1a 82%, transparent)` }}>
      {[12, 46, 78].map((top, i) => (
        <div key={i} className="cloud pointer-events-none absolute h-16 w-48 rounded-full bg-white/80 blur-[2px] sm:h-20 sm:w-64" style={{ top: `${top}%`, left: `${(i * 37) % 70}%` }} aria-hidden>
          <span className="absolute -top-6 left-8 h-14 w-20 rounded-full bg-white/80 sm:h-16 sm:w-24" />
          <span className="absolute -top-9 left-24 h-16 w-24 rounded-full bg-white/80 sm:h-20 sm:w-28" />
        </div>
      ))}
      <div className="relative mx-auto max-w-6xl px-5 pt-24 text-center sm:pt-32">
        <Meta memory={memory} accent={accent} />
        <Title className="mt-3 text-4xl sm:text-6xl" accent={accent}>
          {memory.title}
        </Title>
        {memory.description && <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-tinta-soft">{memory.description}</p>}
      </div>
      <div className="relative mx-auto h-[min(150vw,1100px)] max-w-6xl sm:h-[min(95vw,980px)]">
        {items.map((m, i) => {
          const sp = SPOTS[i];
          return (
            <div key={m.id} className="bb absolute" style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.s + (items.length < 5 ? 10 : 0)}%` }}>
              <motion.div
                className="aspect-square rounded-full border-[6px] border-white bg-white shadow-lift"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ type: "spring", stiffness: 160, damping: 11, delay: (i % 4) * 0.1 }}
                whileHover={{ scale: 1.07 }}
              >
                <motion.div className="h-full w-full" animate={{ y: [0, -10, 0], rotate: [0, i % 2 ? 2 : -2, 0] }} transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" }}>
                  <Media gallery={memory.media} galleryTitle={memory.title} media={m} className="h-full w-full rounded-full" sizes="(min-width: 640px) 34vw, 50vw" />
                </motion.div>
                {/* brillo de burbuja */}
                <span className="pointer-events-none absolute left-[16%] top-[12%] h-[16%] w-[22%] -rotate-[30deg] rounded-full bg-white/70 blur-[2px]" aria-hidden />
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
