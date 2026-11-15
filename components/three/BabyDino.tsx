"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS, skin } from "./materials";
import { Cheek, Eye, lookAtTarget, pointerHandlers, Smile, useBlink, type DinoProps } from "./rig";

const eggTexCache = new Map<string, THREE.Texture>();
function eggTexture(base: string, spotA: string, spotB: string) {
  const key = base + spotA + spotB;
  const hit = eggTexCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 256);
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.55 + r() * 0.35;
    g.fillStyle = i % 3 === 0 ? spotB : spotA;
    const x = r() * 512;
    const y = 30 + r() * 200;
    const rad = 8 + r() * 22;
    g.beginPath();
    g.ellipse(x, y, rad * 1.2, rad, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  eggTexCache.set(key, tex);
  return tex;
}

const H = 1;
const R = 0.4;
const eggRadius = (y: number) => {
  const p = THREE.MathUtils.clamp(y / H, 0, 1);
  return R * Math.sqrt(Math.sin(Math.PI * p)) * (1.1 - 0.25 * p);
};
const TEETH = 9;
const cutAt = (u: number) => {
  const tri = Math.abs(((u * TEETH) % 1) - 0.5) * 2; // 0..1
  return 0.56 + (tri - 0.5) * 0.14;
};

/** Mitad de cáscara con borde en zigzag. part = "bottom" | "top" */
function shellGeometry(part: "bottom" | "top") {
  const segU = TEETH * 8;
  const segV = 18;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segV; j++) {
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const cut = cutAt(u);
      const v = j / segV;
      const y = part === "bottom" ? v * cut : cut + v * (H - cut);
      const rr = eggRadius(y);
      const a = u * Math.PI * 2;
      pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
      uv.push(u, y);
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + segU + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

type BabyProps = DinoProps & {
  hatched?: boolean;
  onHatch?: () => void;
  eggColor?: { base: string; a: string; b: string };
  bodyColor?: string;
};

/**
 * Bebé dinosaurio dentro de su huevo (inspirado en la referencia 3D):
 * menta suave, ojos enormes, corbatín verde y crestas redondeadas.
 * Al tocar el huevo, se abre y el bebé saluda.
 */
export function BabyDino({
  hatched = false,
  onHatch,
  look = "pointer",
  eggColor = { base: "#FBF3E4", a: "#9CC9A6", b: "#E5B866" },
  bodyColor = COLORS.baby.body,
  shadows = true,
  groupRef,
  ...props
}: BabyProps) {
  const eggGroup = useRef<THREE.Group>(null!);
  const top = useRef<THREE.Group>(null!);
  const baby = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const arm = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.Group[]>([]);
  const blink = useBlink();
  const hatchT = useRef<number | null>(null);
  const wasHatched = useRef(hatched);

  const geo = useMemo(
    () => ({
      bottom: shellGeometry("bottom"),
      top: shellGeometry("top"),
      head: new THREE.SphereGeometry(0.27, 36, 26),
      body: new THREE.SphereGeometry(0.2, 28, 20),
      spike: new THREE.ConeGeometry(0.06, 0.13, 12),
      arm: new THREE.CapsuleGeometry(0.05, 0.1, 4, 10),
      bow: new THREE.ConeGeometry(0.06, 0.1, 4),
      knot: new THREE.SphereGeometry(0.035, 12, 10),
      fang: new THREE.ConeGeometry(0.012, 0.03, 6),
      wing: new THREE.CircleGeometry(0.1, 3),
    }),
    [],
  );
  const mat = useMemo(() => {
    const shell = new THREE.MeshStandardMaterial({ map: eggTexture(eggColor.base, eggColor.a, eggColor.b), roughness: 0.5, side: THREE.DoubleSide });
    const wing = skin("#8FD6BE").clone();
    wing.side = THREE.DoubleSide;
    return {
      shell,
      body: skin(bodyColor, { spots: COLORS.baby.spots, seed: 41, density: 0.35 }),
      belly: skin(COLORS.baby.belly),
      spike: skin(COLORS.baby.spikes, { rough: 0.4 }),
      bow: skin(COLORS.baby.bow, { rough: 0.6 }),
      fang: skin("#ffffff"),
      wing,
    };
  }, [eggColor.base, eggColor.a, eggColor.b, bodyColor]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (hatched && !wasHatched.current) hatchT.current = t;
    wasHatched.current = hatched;

    if (!hatched) {
      // bamboleo esporádico: "algo se mueve adentro"
      const k = t % 4.5;
      const wob = k < 0.7 ? Math.sin(k * 28) * 0.09 * (1 - k / 0.7) : 0;
      eggGroup.current.rotation.z = wob;
      top.current.position.set(0, 0, 0);
      top.current.rotation.set(0, 0, 0);
      top.current.scale.setScalar(1);
      baby.current.scale.setScalar(0.0001);
      return;
    }
    const since = hatchT.current === null ? 99 : t - hatchT.current;
    eggGroup.current.rotation.z = THREE.MathUtils.damp(eggGroup.current.rotation.z, 0, 6, delta);
    // la tapa sale volando en parábola
    if (since < 1.6) {
      top.current.position.set(since * 0.5, since * 1.6 - since * since * 1.4, since * 0.2);
      top.current.rotation.set(since * 2.2, 0, -since * 3);
      top.current.scale.setScalar(Math.max(0.0001, 1 - Math.max(0, since - 1) / 0.6));
    } else top.current.scale.setScalar(0.0001);
    // el bebé aparece con rebote
    const pop = Math.min(1, since / 0.55);
    const overshoot = pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.25 : 1;
    baby.current.scale.setScalar(Math.max(0.0001, pop * overshoot));
    baby.current.position.y = 0.32 + Math.sin(t * 2) * 0.015 + (since < 0.6 ? Math.sin(pop * Math.PI) * 0.15 : 0);
    // saluda
    arm.current.rotation.z = -1.9 + Math.sin(t * 9) * 0.45 * (since < 4 ? 1 : 0.5 + 0.5 * Math.sin(t * 0.7));
    lookAtTarget(head.current, state, look, delta, { yaw: 0.7, pitch: 0.35 });
    head.current.rotation.z = Math.sin(t * 1.6) * 0.06;
    const eyeY = since < 0.7 ? 0.4 : blink(t);
    eyes.current.forEach((e) => e && (e.scale.y = THREE.MathUtils.damp(e.scale.y, eyeY, 30, delta)));
  });

  const spikes = useMemo(
    () =>
      [-0.5, -0.15, 0.2, 0.55, 0.9].map((a, i) => ({
        pos: [0, Math.cos(a) * 0.26, -Math.sin(a) * 0.26 + 0.02] as [number, number, number],
        rot: [-a, 0, 0] as [number, number, number],
        s: 1.15 - i * 0.12,
      })),
    [],
  );

  return (
    <group ref={groupRef} {...props}>
      <group
        {...pointerHandlers(() => {
          if (!hatched) onHatch?.();
        })}
      >
        <group ref={eggGroup}>
          <mesh geometry={geo.bottom} material={mat.shell} castShadow={shadows} receiveShadow />
          <group ref={top}>
            <mesh geometry={geo.top} material={mat.shell} castShadow={shadows} />
          </group>
        </group>
        <group ref={baby} position={[0, 0.32, 0]}>
          <mesh geometry={geo.body} material={mat.body} scale={[1, 1.1, 0.95]} />
          <mesh geometry={geo.body} material={mat.belly} position={[0, -0.02, 0.06]} scale={[0.72, 0.85, 0.75]} />
          {/* alitas */}
          <mesh geometry={geo.wing} material={mat.wing} position={[0.2, 0.08, -0.1]} rotation={[0, 0.9, 0.4]} scale={[1.4, 1, 1]} />
          <mesh geometry={geo.wing} material={mat.wing} position={[-0.2, 0.08, -0.1]} rotation={[0, -0.9, -0.4]} scale={[1.4, 1, 1]} />
          {/* corbatín */}
          <group position={[0, 0.15, 0.17]}>
            <mesh geometry={geo.bow} material={mat.bow} position={[-0.06, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.5]} />
            <mesh geometry={geo.bow} material={mat.bow} position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.5]} />
            <mesh geometry={geo.knot} material={mat.bow} />
          </group>
          {/* brazos sobre el borde del huevo */}
          <group position={[-0.2, 0.05, 0.1]} rotation={[0, 0, 1.2]}>
            <mesh geometry={geo.arm} material={mat.body} position={[0, -0.08, 0]} />
          </group>
          <group ref={arm} position={[0.2, 0.06, 0.1]} rotation={[0, 0, -1.9]}>
            <mesh geometry={geo.arm} material={mat.body} position={[0, -0.08, 0]} />
          </group>
          {/* cabeza */}
          <group ref={head} position={[0, 0.38, 0.02]}>
            <mesh geometry={geo.head} material={mat.body} scale={[1.08, 0.96, 0.98]} />
            {spikes.map((s, i) => (
              <mesh key={i} geometry={geo.spike} material={mat.spike} position={s.pos} rotation={s.rot} scale={s.s} />
            ))}
            {[-1, 1].map((sx) => (
              <mesh key={sx} geometry={geo.spike} material={mat.spike} position={[sx * 0.22, 0.14, -0.06]} rotation={[0, 0, -sx * 0.9]} scale={0.9} />
            ))}
            <Eye size={0.095} position={[-0.11, 0.0, 0.21]} rotation={[0, -0.32, 0]} eyeRef={(el) => void (eyes.current[0] = el!)} />
            <Eye size={0.095} position={[0.11, 0.0, 0.21]} rotation={[0, 0.32, 0]} eyeRef={(el) => void (eyes.current[1] = el!)} />
            <Cheek size={0.07} position={[-0.19, -0.1, 0.17]} rotation={[0, -0.8, 0]} />
            <Cheek size={0.07} position={[0.19, -0.1, 0.17]} rotation={[0, 0.8, 0]} />
            <Smile radius={0.045} tube={0.009} position={[0, -0.11, 0.245]} />
            <mesh geometry={geo.fang} material={mat.fang} position={[-0.025, -0.15, 0.245]} rotation={[Math.PI, 0, 0]} />
            <mesh geometry={geo.fang} material={mat.fang} position={[0.025, -0.15, 0.245]} rotation={[Math.PI, 0, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}
