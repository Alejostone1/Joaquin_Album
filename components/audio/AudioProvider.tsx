"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AudioEngine, Sfx } from "./engine";

type AudioState = {
  /** el usuario eligió escuchar sonido */
  enabled: boolean;
  volume: number;
  setEnabled: (on: boolean) => void;
  setVolume: (v: number) => void;
  play: (sfx: Sfx) => void;
};

const AudioCtx = createContext<AudioState>({
  enabled: false,
  volume: 0.7,
  setEnabled: () => {},
  setVolume: () => {},
  play: () => {},
});

const KEY = "jq_audio";

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const engine = useRef<AudioEngine | null>(null);
  const loaded = useRef(false);

  // Preferencia guardada (el sonido nunca arranca sin un gesto del usuario)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as { enabled?: boolean; volume?: number };
        if (typeof p.volume === "number") setVolumeState(p.volume);
        if (p.enabled) setEnabledState(true);
      }
    } catch {
      /* almacenamiento no disponible */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ enabled, volume }));
    } catch {
      /* noop */
    }
  }, [enabled, volume]);

  const ensureEngine = useCallback(async () => {
    if (!engine.current) {
      const { AudioEngine } = await import("./engine");
      engine.current = new AudioEngine(volume);
    }
    await engine.current.resume();
    engine.current.setVolume(volume);
    engine.current.startAmbience();
    engine.current.startMusic();
    return engine.current;
  }, [volume]);

  // Si estaba activado en una visita anterior, espera el primer gesto para arrancar.
  useEffect(() => {
    if (!enabled) {
      engine.current?.suspend();
      return;
    }
    if (engine.current?.ctx.state === "running") return;
    const start = () => {
      ensureEngine().catch(() => {});
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [enabled, ensureEngine]);

  useEffect(() => {
    engine.current?.setVolume(volume);
  }, [volume]);

  // Pausa al ocultar la pestaña
  useEffect(() => {
    const onVis = () => {
      const e = engine.current;
      if (!e) return;
      if (document.hidden) e.ctx.suspend();
      else if (enabled) e.ctx.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      // llamado dentro de un gesto: arrancamos de inmediato
      if (on) ensureEngine().catch(() => {});
    },
    [ensureEngine],
  );

  const play = useCallback(
    (sfx: Sfx) => {
      if (!enabled) return;
      const e = engine.current;
      if (e && e.ctx.state === "running") e.play(sfx);
    },
    [enabled],
  );

  const value = useMemo(
    () => ({ enabled, volume, setEnabled, setVolume: setVolumeState, play }),
    [enabled, volume, setEnabled, play],
  );
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export const useAudio = () => useContext(AudioCtx);
