"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAudio } from "./AudioProvider";

export function AudioControls({ className = "" }: { className?: string }) {
  const { enabled, setEnabled, volume, setVolume, play } = useAudio();
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <AnimatePresence>
        {open && enabled && (
          <motion.label
            initial={{ opacity: 0, x: 12, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.9 }}
            className="absolute right-12 flex items-center gap-2 rounded-full border-2 border-tinta bg-papel px-3 py-2 shadow-soft"
          >
            <span className="sr-only">Volumen</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer accent-turquesa"
            />
          </motion.label>
        )}
      </AnimatePresence>
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={enabled ? "Silenciar sonido" : "Activar sonido"}
        onClick={() => {
          setEnabled(!enabled);
          if (!enabled) setTimeout(() => play("boop"), 120);
        }}
        className="grid h-11 w-11 place-items-center rounded-full border-2 border-tinta bg-papel text-tinta shadow-[0_4px_0_#21372b] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#21372b]"
      >
        <SpeakerIcon on={enabled} />
      </button>
    </div>
  );
}

export function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10v4h3.5L12 18V6L7.5 10z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18 6.8a7.5 7.5 0 0 1 0 10.4" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}
