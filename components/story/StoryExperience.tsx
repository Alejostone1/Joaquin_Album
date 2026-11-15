"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AudioControls } from "@/components/audio/AudioControls";
import { useAudio } from "@/components/audio/AudioProvider";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { Footprint, WatercolorBlob } from "@/components/ui/Watercolor";
import { SCENE_META, type SceneId } from "@/lib/constants";
import { detectQuality, prefersReducedMotion } from "@/lib/quality";
import type { StoryData } from "@/lib/types";
import { BirthScene, ChapterOpener, EmptyChapter, Ending, FamilyTable, LettersScene, MemoryList, Timeline } from "./chapters";
import { ScrollTrigger } from "./useScrollFx";
import { PteroArt, StegoArt, TriceArt } from "@/components/ui/DinoArt";

const Companion = dynamic(() => import("./Companion"), { ssr: false });

export function StoryExperience({ data }: { data: StoryData }) {
  const scenes = data.scenes.filter((s) => s.enabled);
  const [active, setActive] = useState<SceneId>(scenes[0]?.id ?? "ANTES");
  const [moving, setMoving] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [use3D, setUse3D] = useState<boolean | null>(null);
  const { play } = useAudio();
  const canEdit = data.viewer.role !== "FAMILY";
  const prevActive = useRef(active);

  useEffect(() => {
    const q = detectQuality();
    setUse3D(q !== "static" && q !== "low" && !prefersReducedMotion());
  }, []);

  // capítulo activo según el scroll
  useEffect(() => {
    const triggers = scenes.map((s) =>
      ScrollTrigger.create({
        trigger: `#${SCENE_META[s.id].slug}`,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setActive(s.id),
      }),
    );
    // las imágenes cambian alturas: recalcular cuando cargan
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const id = setTimeout(refresh, 1200);
    return () => {
      triggers.forEach((t) => t.kill());
      window.removeEventListener("load", refresh);
      clearTimeout(id);
    };
  }, [scenes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prevActive.current !== active) {
      play("whoosh");
      prevActive.current = active;
    }
  }, [active, play]);

  // el acompañante camina mientras haces scroll
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setMoving(true);
      clearTimeout(t);
      t = setTimeout(() => setMoving(false), 260);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const meta = SCENE_META[active];
  const go = (id: SceneId) => document.getElementById(SCENE_META[id].slug)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <div className="relative overflow-x-clip" style={{ ["--accent" as string]: meta.accent }}>
      {/* lavado de color del capítulo */}
      <div className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-1000" style={{ background: meta.wash }} aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70" style={{ backgroundImage: "var(--grain)" }} aria-hidden />

      <StoryHeader scenes={scenes.map((s) => s.id)} active={active} onGo={go} viewerName={data.viewer.name} canEdit={canEdit} />

      {data.preview && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border-2 border-tinta bg-sol px-4 py-2 font-ui text-sm font-bold shadow-soft">
          Vista previa: ves también los borradores · <Link href="/historia" className="underline">Salir</Link>
        </div>
      )}

      <Prologue scenes={scenes.map((s) => ({ id: s.id, title: s.title }))} onGo={go} name={data.viewer.name} />

      {scenes.map((scene, idx) => {
        const m = SCENE_META[scene.id];
        const list = data.memories[scene.id] ?? [];
        return (
          <section key={scene.id} id={m.slug} aria-labelledby={`${m.slug}-t`} className="relative scroll-mt-20">
            <span id={`${m.slug}-t`} className="sr-only">
              {scene.title}
            </span>
            <ChapterOpener scene={scene} meta={m} number={idx + 1} />
            {scene.id === "LLEGADA" && <BirthScene birth={data.birth} accent={m.accent} canEdit={canEdit} />}
            {scene.id === "CRECIENDO" && <Timeline milestones={data.milestones} accent={m.accent} canEdit={canEdit} />}
            {scene.id === "FAMILIA" && <FamilyTable memories={list} accent={m.accent} />}
            {scene.id === "CARTAS" ? (
              <LettersScene letters={data.letters} viewer={data.viewer} birthDate={data.birth.birthDate} accent={m.accent} />
            ) : list.length ? (
              <MemoryList memories={list} accent={m.accent} />
            ) : scene.id !== "LLEGADA" && scene.id !== "CRECIENDO" ? (
              <EmptyChapter canEdit={canEdit} accent={m.accent} label={scene.title} />
            ) : null}
          </section>
        );
      })}

      <Ending />

      {/* compañero del capítulo */}
      <div className="pointer-events-none fixed bottom-2 left-2 z-30 h-[118px] w-[118px] sm:bottom-4 sm:left-4 sm:h-[190px] sm:w-[190px]" aria-hidden>
        {use3D ? (
          <Companion
            kind={meta.companion}
            moving={moving}
            celebrateKey={celebrate}
            onPoke={() => {
              play("rawr");
              setCelebrate((k) => k + 1);
            }}
          />
        ) : use3D === false ? (
          <AnimatePresence mode="wait">
            <motion.div key={meta.companion} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0, y: moving ? [0, -6, 0] : 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16, y: { duration: 0.35, repeat: moving ? Infinity : 0 } }} className="h-full w-full p-3">
              {meta.companion === "trice" ? <TriceArt className="h-full w-full" /> : meta.companion === "ptero" ? <PteroArt className="h-full w-full" /> : <StegoArt className="h-full w-full" />}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}

function Prologue({ scenes, onGo, name }: { scenes: Array<{ id: SceneId; title: string }>; onGo: (id: SceneId) => void; name: string }) {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-28 text-center">
      <WatercolorBlob color="#FFE89A" seed={2} className="absolute -left-24 -top-10 h-[50vh] w-[50vh]" opacity={0.5} />
      <WatercolorBlob color="#8FD3F4" seed={6} className="absolute -right-20 top-1/3 h-[46vh] w-[46vh]" opacity={0.35} />
      <WatercolorBlob color="#FFB7CF" seed={11} className="absolute bottom-0 left-1/4 h-[36vh] w-[36vh]" opacity={0.35} />
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative font-display text-xl font-medium text-tinta-soft sm:text-2xl">
        Había una vez un pequeño universo llamado…
      </motion.p>
      <div className="relative mt-3">
        <BubbleWord as="h1" text="JOAQUÍN" className="text-[clamp(3.4rem,13vw,9rem)]" delay={0.2} />
      </div>
      <p className="relative mt-4 max-w-lg font-ui font-bold text-tinta-soft">
        Hola, {name.split(" ")[0]}. Sigue las huellas: cada una es un capítulo de su historia.
      </p>
      <nav aria-label="Capítulos" className="relative mt-10 w-full max-w-4xl">
        <svg viewBox="0 0 800 120" className="absolute inset-x-0 top-1/2 hidden h-28 w-full -translate-y-1/2 sm:block" preserveAspectRatio="none" aria-hidden>
          <path d="M10 60 C 120 0, 220 120, 330 60 S 540 0, 650 60 S 760 110, 790 60" fill="none" stroke="#21372B" strokeOpacity=".22" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" />
        </svg>
        <ol className="relative grid grid-cols-2 gap-3 sm:flex sm:justify-between">
          {scenes.map((s, i) => {
            const m = SCENE_META[s.id];
            return (
              <motion.li key={s.id} initial={{ opacity: 0, y: 20, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 220, damping: 14 }} className={i % 2 ? "sm:translate-y-6" : "sm:-translate-y-6"}>
                <button onClick={() => onGo(s.id)} className="group flex w-full flex-col items-center gap-1 rounded-2xl p-2 transition hover:-translate-y-1">
                  <span className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-tinta bg-papel shadow-soft transition group-hover:scale-110" style={{ boxShadow: `0 5px 0 ${m.accent}` }}>
                    <Footprint className="h-8 w-8" color={m.accent} style={{ rotate: `${i % 2 ? 12 : -12}deg` }} />
                  </span>
                  <span className="font-ui text-[11px] font-bold uppercase tracking-widest text-tinta-mute">Cap. {i + 1}</span>
                  <span className="font-heading text-sm font-bold leading-tight">{s.title}</span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      </nav>
      <motion.div className="relative mt-12 font-ui text-sm font-bold text-tinta-mute" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
        Baja para empezar ↓
      </motion.div>
    </section>
  );
}

function StoryHeader({ scenes, active, onGo, viewerName, canEdit }: { scenes: SceneId[]; active: SceneId; onGo: (id: SceneId) => void; viewerName: string; canEdit: boolean }) {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full bg-papel/85 px-4 py-1.5 shadow-soft backdrop-blur" aria-label="Volver al inicio de la historia">
        <BubbleWord text="Joaquín" className="text-2xl" animate={false} />
      </button>
      <nav aria-label="Capítulos" className="hidden items-center gap-1 rounded-full bg-papel/85 px-2 py-1.5 shadow-soft backdrop-blur md:flex">
        {scenes.map((id, i) => {
          const m = SCENE_META[id];
          const on = id === active;
          return (
            <button key={id} onClick={() => onGo(id)} className="group relative grid h-9 w-9 place-items-center rounded-full transition" style={{ background: on ? `${m.accent}26` : undefined }} aria-current={on ? "step" : undefined} aria-label={m.title}>
              <Footprint className={`h-5 w-5 transition ${on ? "scale-125" : "opacity-50 group-hover:opacity-100"}`} color={on ? m.accent : "#21372B"} style={{ rotate: `${i % 2 ? 14 : -14}deg` }} />
              <span className="pointer-events-none absolute top-11 whitespace-nowrap rounded-full bg-tinta px-3 py-1 font-ui text-xs font-bold text-papel opacity-0 transition group-hover:opacity-100">{m.title}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex items-center gap-2">
        <AudioControls />
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" className="grid h-11 w-11 place-items-center rounded-full border-2 border-tinta bg-papel shadow-[0_4px_0_#21372b]" aria-label="Menú">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden>
              <path d="M5 7h14M5 12h14M5 17h9" />
            </svg>
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div role="menu" initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-14 w-64 rounded-3xl border-2 border-tinta bg-papel p-2 shadow-lift">
                <p className="px-3 py-2 font-ui text-xs font-bold text-tinta-mute">Sesión de {viewerName}</p>
                <div className="md:hidden">
                  {scenes.map((id) => (
                    <button key={id} role="menuitem" onClick={() => { setMenu(false); onGo(id); }} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left font-heading font-bold hover:bg-crema">
                      <Footprint className="h-4 w-4" color={SCENE_META[id].accent} />
                      {SCENE_META[id].title}
                    </button>
                  ))}
                  <hr className="my-1 border-tinta/10" />
                </div>
                {canEdit && (
                  <Link role="menuitem" href="/admin" className="block rounded-2xl px-3 py-2 font-heading font-bold hover:bg-crema">
                    Administrador familiar
                  </Link>
                )}
                <Link role="menuitem" href="/" className="block rounded-2xl px-3 py-2 font-heading font-bold hover:bg-crema">
                  Volver al bosque
                </Link>
                <button role="menuitem" onClick={logout} className="block w-full rounded-2xl px-3 py-2 text-left font-heading font-bold text-coral-600 hover:bg-coral-100">
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
