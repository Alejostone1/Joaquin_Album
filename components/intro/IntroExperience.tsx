"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AudioControls } from "@/components/audio/AudioControls";
import { useAudio } from "@/components/audio/AudioProvider";
import type { IntroPhase } from "@/components/three/IntroScene";
import { BubbleWord } from "@/components/ui/BubbleWord";
import { PteroArt, StegoArt, TriceArt } from "@/components/ui/DinoArt";
import { FernLeaf, Footprint, WatercolorBlob } from "@/components/ui/Watercolor";
import { detectQuality, prefersReducedMotion, type QualityMode } from "@/lib/quality";
import { LoginSheet } from "./LoginSheet";

const IntroCanvas = dynamic(() => import("./IntroCanvas"), { ssr: false });

type Props = { userName: string | null; askLogin: boolean };

export function IntroExperience({ userName, askLogin }: Props) {
  const router = useRouter();
  const { setEnabled, play } = useAudio();
  const [quality, setQuality] = useState<QualityMode | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [skip, setSkip] = useState(false);
  const [seenBefore, setSeenBefore] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("idle");
  const [loginOpen, setLoginOpen] = useState(false);
  const [exitKey, setExitKey] = useState(0);
  const [wipe, setWipe] = useState(false);
  const [loggedName, setLoggedName] = useState(userName);

  useEffect(() => {
    const q = detectQuality();
    setQuality(q);
    if (q === "static") setLoaded(true);
    try {
      setSeenBefore(localStorage.getItem("jq_seen_intro") === "1");
    } catch {
      /* noop */
    }
    router.prefetch("/historia");
  }, [router]);

  const begin = (withSound: boolean, skipIntro = false) => {
    setEnabled(withSound);
    const reduce = prefersReducedMotion();
    setSkip(skipIntro || reduce);
    setStarted(true);
    if (quality === "static") {
      setPhase("title");
      setTimeout(() => setPhase("ready"), 1400);
      if (withSound) setTimeout(() => play("chime"), 400);
    }
    try {
      localStorage.setItem("jq_seen_intro", "1");
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (phase === "ready" && askLogin && !loggedName) setLoginOpen(true);
  }, [phase, askLogin, loggedName]);

  const goToStory = useCallback(() => {
    setWipe(true);
    setTimeout(() => router.push("/historia"), 650);
  }, [router]);

  const enter = () => {
    play("boop");
    if (!loggedName) {
      setLoginOpen(true);
      return;
    }
    if (quality === "static") goToStory();
    else setExitKey((k) => k + 1);
  };

  const showTitle = phase === "title" || phase === "ready" || phase === "exiting";
  const is3D = quality && quality !== "static";

  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-menta-50">
      {/* Escena */}
      <div className="absolute inset-0">
        {is3D ? (
          <IntroCanvas
            tier={quality}
            start={started}
            skip={skip}
            exitKey={exitKey}
            onReady={() => setLoaded(true)}
            onPhase={setPhase}
            onExited={goToStory}
            sfx={play}
          />
        ) : quality === "static" ? (
          <Fallback2D />
        ) : null}
      </div>

      {/* Look de cine: viñeta y grano de película */}
      <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(15,26,20,.45) 100%)" }} aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[5] opacity-60 mix-blend-multiply" style={{ backgroundImage: "var(--grain)" }} aria-hidden />

      {/* Franjas de cine durante el vuelo */}
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-[6] bg-[#0b130f]" initial={{ height: 0 }} animate={{ height: started && phase === "flying" ? "11vh" : 0 }} transition={{ duration: 1.2, ease: [0.7, 0, 0.2, 1] }} aria-hidden />
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] bg-[#0b130f]" initial={{ height: 0 }} animate={{ height: started && phase === "flying" ? "11vh" : 0 }} transition={{ duration: 1.2, ease: [0.7, 0, 0.2, 1] }} aria-hidden />

      {/* Créditos de apertura */}
      <Credits playing={started && phase === "flying"} />

      {/* Viñeta suave para legibilidad del título */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-papel/55 via-papel/15 to-transparent" />

      {/* Carga */}
      <AnimatePresence>{!loaded && <Loader key="loader" />}</AnimatePresence>

      {/* Elección de sonido: el gesto que respeta las reglas del navegador */}
      <AnimatePresence>
        {loaded && !started && (
          <motion.div
            key="choice"
            className="absolute inset-0 z-20 grid place-items-center bg-bosque-900/25 p-5 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative w-full max-w-sm rounded-[2rem] border-[3px] border-tinta bg-papel p-7 text-center shadow-lift"
            >
              <p className="font-ui text-xs font-bold uppercase tracking-[0.25em] text-esmeralda">Una película para la familia</p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">¿Entramos con sonido?</h2>
              <p className="mt-2 font-ui text-sm font-semibold text-tinta-soft">Hay pájaros, una cascada y una canción de cuna. Puedes cambiarlo cuando quieras.</p>
              <div className="mt-6 grid gap-3">
                <button className="btn-candy" onClick={() => begin(true)} autoFocus>
                  Con sonido
                </button>
                <button className="btn-soft" onClick={() => begin(false)}>
                  Sin sonido
                </button>
              </div>
              {seenBefore && (
                <button className="mt-4 font-ui text-sm font-bold text-turquesa underline decoration-2 underline-offset-4" onClick={() => begin(false, true)}>
                  Saltar la introducción
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Título */}
      <div className="pointer-events-none absolute inset-x-0 top-[7svh] z-10 flex flex-col items-center px-4 text-center sm:top-[8svh]">
        {showTitle && (
          <>
            <h1 className="sr-only">Joaquín — Mi pequeño universo</h1>
            <TitleBurst />
            <div className="pointer-events-auto relative drop-shadow-[0_10px_18px_rgba(33,55,43,0.25)]">
              <BubbleWord text="JOAQUÍN" className="text-[clamp(3.6rem,15vw,10.5rem)]" delay={0.1} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 14, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.16em" }}
              transition={{ delay: 0.9, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="outline-title mt-1 font-heading text-[clamp(1.05rem,3.6vw,2.1rem)] font-extrabold uppercase"
              aria-hidden
            >
              Mi pequeño universo
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7, duration: 1.2 }}
              className="text-shadow-soft mt-3 font-heading text-[clamp(1rem,2.4vw,1.35rem)] font-semibold text-bosque"
            >
              “Una historia de amor que apenas comienza”
            </motion.p>
          </>
        )}
      </div>

      {/* Botón */}
      <div className="absolute inset-x-0 bottom-[max(5svh,env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-3 px-4">
        <AnimatePresence>
          {(phase === "ready" || phase === "exiting") && (
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex flex-col items-center gap-3">
              <motion.button
                onClick={enter}
                disabled={phase === "exiting"}
                className="btn-candy px-9 py-4 text-xl uppercase tracking-wide"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Footprint className="h-6 w-6" color="#21372B" />
                Entrar a mi historia
              </motion.button>
              <p className="text-shadow-soft font-ui text-sm font-bold text-bosque">
                {loggedName ? `Hola, ${loggedName.split(" ")[0]}. Toca a los dinosaurios o abre un huevo.` : "Toca a los dinosaurios o abre un huevo."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controles */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
        {started && phase === "flying" && (
          <button className="btn-soft py-2 text-xs" onClick={() => setSkip(true)}>
            Saltar
          </button>
        )}
        <AudioControls />
      </div>

      <LoginSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(name) => {
          setLoggedName(name);
          setLoginOpen(false);
          play("chime");
          router.refresh();
          setTimeout(() => (quality === "static" ? goToStory() : setExitKey((k) => k + 1)), 350);
        }}
      />

      {/* Transición acuarelada hacia la historia */}
      <AnimatePresence>
        {wipe && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-40 bg-papel"
            initial={{ clipPath: "circle(0% at 50% 60%)" }}
            animate={{ clipPath: "circle(150% at 50% 60%)" }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Loader() {
  return (
    <motion.div className="absolute inset-0 z-30 grid place-items-center bg-menta-50" exit={{ opacity: 0, transition: { duration: 0.8 } }}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-3" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
              style={{ rotate: i % 2 ? 12 : -12, translateY: i % 2 ? 8 : 0 }}
            >
              <Footprint className="h-9 w-9" color={["#2BA36B", "#1FB5B0", "#FFC93C", "#FF8A7A", "#E86A9A"][i]} />
            </motion.span>
          ))}
        </div>
        <p className="font-heading text-lg font-bold text-bosque" role="status">
          Preparando el bosque…
        </p>
      </div>
    </motion.div>
  );
}

/** Alternativa 2D ilustrada para equipos sin WebGL o con ahorro de datos. */
function Fallback2D() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-cielo-100 via-menta-50 to-salvia-100">
      <WatercolorBlob color="#FFE89A" seed={4} className="absolute -left-20 -top-24 h-96 w-96" opacity={0.7} />
      <WatercolorBlob color="#8FD3F4" seed={9} className="absolute -right-24 top-10 h-80 w-80" opacity={0.45} />
      <WatercolorBlob color="#A8C3A0" seed={14} className="absolute -bottom-40 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2" opacity={0.75} />
      {[...Array(9)].map((_, i) => (
        <FernLeaf key={i} className="absolute bottom-0 h-56 w-28 origin-bottom animate-[sway_5s_ease-in-out_infinite]" style={{ left: `${i * 12 - 4}%`, rotate: `${(i % 3) * 14 - 14}deg`, animationDelay: `${i * 0.4}s` }} color={i % 2 ? "#2F5D47" : "#4E8F4A"} />
      ))}
      <motion.div className="absolute bottom-[12%] left-1/2 w-[min(70vw,420px)] -translate-x-1/2" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <StegoArt className="w-full" />
      </motion.div>
      <motion.div className="absolute bottom-[10%] right-[6%] w-[min(30vw,200px)]" animate={{ rotate: [0, 2, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        <TriceArt className="w-full" />
      </motion.div>
      <motion.div className="absolute left-[8%] top-[38%] w-[min(26vw,170px)]" animate={{ x: [0, 40, 0], y: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity }}>
        <PteroArt className="w-full" />
      </motion.div>
      <style>{`@keyframes sway { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(4deg) } }`}</style>
    </div>
  );
}

/** Créditos como en el cine, sobre el vuelo de la cámara. */
function Credits({ playing }: { playing: boolean }) {
  const [step, setStep] = useState(-1);
  useEffect(() => {
    if (!playing) {
      setStep(-1);
      return;
    }
    const times = [800, 3500, 6200, 9200];
    const ids = times.map((t, i) => setTimeout(() => setStep(i), t));
    return () => ids.forEach(clearTimeout);
  }, [playing]);
  const cards = [
    { small: "Leidy y Hernán", big: "presentan" },
    { small: "una historia que empezó", big: "con un sueño" },
    { small: "en un bosque donde todo", big: "es posible" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[7] grid place-items-center px-6 text-center" aria-live="polite">
      <AnimatePresence mode="wait">
        {playing && step >= 0 && step < cards.length && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14, filter: "blur(10px)", letterSpacing: "0.5em" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0.18em" }}
            exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-papel [text-shadow:0_2px_24px_rgba(0,0,0,.55)]"
          >
            <p className="font-ui text-sm font-bold uppercase sm:text-base">{cards[step].small}</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-normal sm:text-6xl">{cards[step].big}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Estallido de luz y hojas detrás del título. */
function TitleBurst() {
  const leaves = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = 180 + (i % 3) * 70;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.55, rot: (i % 2 ? 1 : -1) * (120 + i * 20), c: ["#7FB86F", "#FFC93C", "#FFB7CF", "#2BA36B", "#8FD3F4", "#FF8A7A"][i % 6] };
  });
  return (
    <div className="pointer-events-none absolute left-1/2 top-[3.5rem] h-0 w-0" aria-hidden>
      <motion.div
        className="absolute -left-[45vmin] -top-[45vmin] h-[90vmin] w-[90vmin] rounded-full"
        style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,240,190,.55) 0deg 7deg, transparent 7deg 18deg)", maskImage: "radial-gradient(circle, black 15%, transparent 68%)", WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 68%)" }}
        initial={{ scale: 0.2, opacity: 0, rotate: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 0.55], rotate: 120 }}
        transition={{ duration: 6, ease: "easeOut", opacity: { duration: 2 } }}
      />
      <motion.div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,250,225,.95),rgba(255,240,190,0)_65%)]" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.6, 1.1], opacity: [0, 1, 0.65] }} transition={{ duration: 1.4 }} />
      {leaves.map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          width={18 + (i % 4) * 6}
          height={18 + (i % 4) * 6}
          className="absolute"
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
          animate={{ x: l.x, y: [0, l.y, l.y + 140], opacity: [0, 1, 0], rotate: l.rot, scale: 1 }}
          transition={{ duration: 2.8, delay: 0.15 + (i % 5) * 0.04, ease: "easeOut" }}
        >
          <path d="M12 2C6 6 3 12 6 20c1 2 4 2 6 0 7-6 6-13 0-18z" fill={l.c} />
        </motion.svg>
      ))}
    </div>
  );
}
