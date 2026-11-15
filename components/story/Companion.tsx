"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BabyDino } from "@/components/three/BabyDino";
import { frondGeometry } from "@/components/three/Forest";
import { Pterodactyl } from "@/components/three/Pterodactyl";
import type { DinoAction } from "@/components/three/rig";
import { Stegosaurus } from "@/components/three/Stegosaurus";
import { Triceratops } from "@/components/three/Triceratops";
import type { SceneMeta } from "@/lib/constants";

type Kind = SceneMeta["companion"];

type Props = {
  kind: Kind;
  moving: boolean;
  celebrateKey: number;
  onPoke: () => void;
};

function Island() {
  const frond = useMemo(() => frondGeometry(), []);
  const fronds = useMemo(
    () =>
      [
        [-0.75, -0.35, 0.8],
        [0.8, -0.5, 0.65],
      ].flatMap(([x, z, s]) => Array.from({ length: 7 }, (_, k) => ({ x, z, s, ry: (k / 7) * Math.PI * 2, rx: -0.25 }))),
    [],
  );
  return (
    <group>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.15, 0.24, 40]} />
        <meshStandardMaterial color="#9CCB78" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[1.15, 0.7, 0.3, 40]} />
        <meshStandardMaterial color="#B08C63" roughness={1} />
      </mesh>
      {fronds.map((f, i) => (
        <mesh key={i} geometry={frond} position={[f.x, 0, f.z]} rotation={new THREE.Euler(f.rx, f.ry, 0, "YXZ")} scale={f.s * 0.8}>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      ))}
      {[
        [0.95, 0.02, 0.35, "#FF8A7A"],
        [-0.9, 0.02, 0.45, "#FFC93C"],
        [0.3, 0.02, -0.85, "#FFB7CF"],
      ].map(([x, y, z, c], i) => (
        <mesh key={i} position={[x as number, (y as number) + 0.04, z as number]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color={c as string} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ kind, moving, celebrateKey, onPoke }: Props) {
  const swap = useRef<THREE.Group>(null!);
  const [shown, setShown] = useState<Kind>(kind);
  const scaleTarget = useRef(1);
  // transición: se encoge, cambia de personaje y vuelve a aparecer con rebote
  useEffect(() => {
    if (kind === shown) return;
    scaleTarget.current = 0;
    const id = setTimeout(() => {
      setShown(kind);
      scaleTarget.current = 1;
    }, 280);
    return () => clearTimeout(id);
  }, [kind, shown]);
  useFrame((state, delta) => {
    const g = swap.current;
    const s = THREE.MathUtils.damp(g.scale.x, scaleTarget.current, scaleTarget.current ? 7 : 16, delta);
    g.scale.setScalar(Math.max(0.0001, s));
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, moving ? 1.2 : 0.55 + state.pointer.x * 0.25, 3, delta);
  });
  const action: DinoAction = moving ? "walk" : "idle";
  return (
    <group position={[0, -0.55, 0]}>
      <Island />
      <group ref={swap}>
        {shown === "stego" && <Stegosaurus action={action} look="pointer" celebrateKey={celebrateKey} onPoke={onPoke} scale={0.95} />}
        {shown === "trice" && <Triceratops action={action} look="pointer" celebrateKey={celebrateKey} onPoke={onPoke} scale={0.95} />}
        {shown === "ptero" && <Pterodactyl action={moving ? "fly" : "perch"} look="pointer" celebrateKey={celebrateKey} onPoke={onPoke} scale={1.6} position={[0, moving ? 0.5 : 0, 0]} />}
        {shown === "baby" && <BabyDino hatched look="pointer" onHatch={onPoke} scale={1.35} />}
      </group>
    </group>
  );
}

/** Pequeño dinosaurio 3D que acompaña cada capítulo de la historia. */
export default function Companion(props: Props) {
  const [source, setSource] = useState<HTMLElement | null>(null);
  useEffect(() => setSource(document.body), []);
  if (!source) return null;
  return (
    <Canvas
      eventSource={source}
      eventPrefix="client"
      dpr={[1, 1.6]}
      camera={{ fov: 32, position: [0, 1.2, 4.6] }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}
      style={{ pointerEvents: "none" }}
    >
      <hemisphereLight args={["#E6F6FF", "#8FB27A", 1.3]} />
      <directionalLight position={[-3, 5, 4]} intensity={2.2} color="#FFE8C6" />
      <Rig {...props} />
    </Canvas>
  );
}
