"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import type { Sfx } from "@/components/audio/engine";
import { Forest } from "@/components/three/Forest";
import { IntroScene, type IntroPhase } from "@/components/three/IntroScene";
import { TIERS, type Tier } from "@/lib/quality";

type Props = {
  tier: Tier;
  start: boolean;
  skip: boolean;
  exitKey: number;
  onReady: () => void;
  onPhase: (p: IntroPhase) => void;
  onExited: () => void;
  sfx: (s: Sfx) => void;
};

export default function IntroCanvas({ tier: initialTier, start, skip, exitKey, onReady, onPhase, onExited, sfx }: Props) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const cfg = TIERS[tier];
  const [dpr, setDpr] = useState(cfg.dpr[1]);
  const shadows = cfg.shadows > 0;

  return (
    <Canvas
      shadows={shadows ? "soft" : false}
      dpr={dpr}
      camera={{ fov: 40, near: 0.1, far: 320, position: [12, 38, 62] }}
      gl={{ antialias: tier !== "low", powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05;
        // dos cuadros para compilar sombreadores antes de mostrar
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      aria-label="Bosque prehistórico animado con dinosaurios"
      role="img"
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => {
          if (dpr > cfg.dpr[0]) setDpr(Math.max(cfg.dpr[0], dpr - 0.3));
          else if (tier === "high") setTier("medium");
          else if (tier === "medium") setTier("low");
        }}
        onIncline={() => setDpr(Math.min(cfg.dpr[1], dpr + 0.2))}
      />
      <fog attach="fog" args={["#DDEFDA", 20, 92]} />
      <hemisphereLight args={["#D9F1FF", "#7FA36A", 1.15]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-10, 16, 9]}
        intensity={2.5}
        color="#FFE8C6"
        castShadow={shadows}
        shadow-mapSize={[cfg.shadows || 512, cfg.shadows || 512]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
      <Forest tier={cfg} />
      <IntroScene start={start} skip={skip} exitKey={exitKey} shadows={shadows} onPhase={onPhase} onExited={onExited} sfx={sfx} />
    </Canvas>
  );
}
