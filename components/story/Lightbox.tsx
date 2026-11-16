"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAudio } from "@/components/audio/AudioProvider";
import type { MediaDTO } from "@/lib/types";

type Open = (items: MediaDTO[], index: number, title?: string) => void;
const Ctx = createContext<Open | null>(null);
export const useLightbox = () => useContext(Ctx);

/** Visor a pantalla completa: deslizar, flechas del teclado, video con controles. */
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ items: MediaDTO[]; index: number; title?: string } | null>(null);
  const [dir, setDir] = useState(0);
  const { play } = useAudio();
  const open = useCallback<Open>(
    (items, index, title) => {
      play("sparkle");
      setDir(0);
      setState({ items, index, title });
    },
    [play],
  );
  const close = () => setState(null);
  const go = useCallback((d: number) => {
    setDir(d);
    setState((s) => (s ? { ...s, index: (s.index + d + s.items.length) % s.items.length } : s));
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [state, go]);

  const item = state?.items[state.index];
  return (
    <Ctx.Provider value={open}>
      {children}
      <AnimatePresence>
        {state && item && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-bosque-900/95 text-papel backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={state.title ? `Fotos de ${state.title}` : "Visor de fotos"}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="truncate font-heading text-lg font-bold">{state.title}</p>
              <div className="flex items-center gap-3">
                {state.items.length > 1 && (
                  <span className="font-ui text-sm font-bold opacity-80">
                    {state.index + 1} / {state.items.length}
                  </span>
                )}
                <button onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-papel/15 text-2xl hover:bg-papel/25" aria-label="Cerrar">
                  ×
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={item.id}
                  custom={dir}
                  className="absolute inset-0 flex items-center justify-center p-3 sm:p-8"
                  initial={{ x: dir === 0 ? 0 : dir > 0 ? "60%" : "-60%", opacity: 0, scale: dir === 0 ? 0.85 : 1 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={{ x: dir > 0 ? "-60%" : "60%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  drag={state.items.length > 1 && item.kind === "IMAGE" ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(_, info: PanInfo) => {
                    if (info.offset.x < -80) go(1);
                    else if (info.offset.x > 80) go(-1);
                  }}
                >
                  {item.kind === "VIDEO" ? (
                    <video src={item.orig} controls autoPlay playsInline className="max-h-full max-w-full rounded-2xl shadow-lift" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.lg}
                      alt={item.alt}
                      draggable={false}
                      className="max-h-full max-w-full select-none rounded-2xl object-contain shadow-lift"
                      style={{ backgroundImage: item.blur ? `url(${item.blur})` : undefined, backgroundSize: "cover" }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
              {state.items.length > 1 && (
                <>
                  <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-papel/15 text-3xl hover:bg-papel/30 sm:grid" aria-label="Anterior">
                    ‹
                  </button>
                  <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-papel/15 text-3xl hover:bg-papel/30 sm:grid" aria-label="Siguiente">
                    ›
                  </button>
                </>
              )}
            </div>
            <div className="min-h-[3.5rem] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
              {item.caption && <p className="font-heading text-lg font-semibold">{item.caption}</p>}
              {state.items.length > 1 && (
                <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
                  {state.items.map((m, i) => (
                    <span key={m.id} className="h-2 rounded-full bg-papel transition-all" style={{ width: i === state.index ? 22 : 8, opacity: i === state.index ? 1 : 0.4 }} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
