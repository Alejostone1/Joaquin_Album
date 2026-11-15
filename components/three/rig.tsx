"use client";

import { useFrame, type ThreeElements, type RootState } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { blush, COLORS, flat, glossy } from "./materials";

export type DinoAction = "idle" | "walk" | "run" | "sleep" | "celebrate" | "fly" | "perch";
export type LookMode = "pointer" | "camera" | "none";

export type DinoProps = Omit<ThreeElements["group"], "ref"> & {
  action?: DinoAction;
  look?: LookMode;
  /** cambia este número para disparar una celebración */
  celebrateKey?: number;
  onPoke?: () => void;
  shadows?: boolean;
  groupRef?: React.Ref<THREE.Group>;
};

const tmpTarget = new THREE.Vector3();
const tmpHead = new THREE.Vector3();
const tmpLocal = new THREE.Vector3();

/** Parpadeo natural a intervalos aleatorios. Devuelve la escala vertical del ojo. */
export function useBlink() {
  const next = useRef(1 + Math.random() * 3);
  return (t: number, closed = false) => {
    if (closed) return 0.08;
    if (t > next.current + 0.16) next.current = t + 1.8 + Math.random() * 4.2;
    if (t >= next.current) {
      const p = (t - next.current) / 0.16;
      return 1 - Math.sin(p * Math.PI) * 0.92;
    }
    return 1;
  };
}

/** Gira la cabeza (suavemente y con límites) hacia el cursor o la cámara. */
export function lookAtTarget(
  head: THREE.Object3D,
  state: RootState,
  mode: LookMode,
  delta: number,
  limits = { yaw: 0.85, pitch: 0.45 },
  rest = { yaw: 0, pitch: 0 },
) {
  let yaw = rest.yaw;
  let pitch = rest.pitch;
  if (mode !== "none" && head.parent) {
    head.getWorldPosition(tmpHead);
    if (mode === "pointer") {
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const d = state.camera.position.distanceTo(tmpHead) * 0.6;
      state.raycaster.ray.at(d, tmpTarget);
    } else {
      tmpTarget.copy(state.camera.position);
    }
    tmpLocal.copy(tmpTarget);
    head.parent.worldToLocal(tmpLocal);
    tmpLocal.sub(head.position);
    yaw = THREE.MathUtils.clamp(Math.atan2(tmpLocal.x, tmpLocal.z), -limits.yaw, limits.yaw);
    pitch = THREE.MathUtils.clamp(-Math.atan2(tmpLocal.y, Math.hypot(tmpLocal.x, tmpLocal.z)), -limits.pitch, limits.pitch);
  }
  head.rotation.y = THREE.MathUtils.damp(head.rotation.y, yaw, 4, delta);
  head.rotation.x = THREE.MathUtils.damp(head.rotation.x, pitch, 4, delta);
}

/** Lleva el tiempo de inicio de una celebración (salto feliz). */
export function useCelebrate(key: number | undefined) {
  const start = useRef(-10);
  const lastKey = useRef(key);
  return {
    trigger: (t: number) => {
      start.current = t;
    },
    /** 0..1 durante la celebración, -1 si no está activa */
    progress: (t: number, duration = 1.25) => {
      if (key !== lastKey.current) {
        lastKey.current = key;
        start.current = t;
      }
      const p = (t - start.current) / duration;
      return p >= 0 && p <= 1 ? p : -1;
    },
  };
}

/** Ojo grande y brillante con iris oliva y dos destellos (como la referencia). */
export function Eye({
  size = 0.1,
  eyeRef,
  ...props
}: ThreeElements["group"] & { size?: number; eyeRef?: React.Ref<THREE.Group> }) {
  const geo = useMemo(
    () => ({
      ball: new THREE.SphereGeometry(size, 24, 18),
      iris: new THREE.TorusGeometry(size * 0.6, size * 0.13, 10, 32),
      hi: new THREE.SphereGeometry(size * 0.27, 12, 10),
      hi2: new THREE.SphereGeometry(size * 0.12, 10, 8),
    }),
    [size],
  );
  return (
    <group {...props}>
      <group ref={eyeRef}>
        <mesh geometry={geo.ball} material={glossy(COLORS.eye)} scale={[1, 1.08, 0.72]} />
        <mesh geometry={geo.iris} material={flat(COLORS.iris, 0.85)} position={[0, -size * 0.06, size * 0.62]} scale={[1, 1.05, 0.4]} />
        <mesh geometry={geo.hi} material={flat("#ffffff")} position={[-size * 0.32, size * 0.36, size * 0.6]} />
        <mesh geometry={geo.hi2} material={flat("#ffffff")} position={[size * 0.34, -size * 0.28, size * 0.66]} />
      </group>
    </group>
  );
}

export function Cheek(props: ThreeElements["mesh"] & { size?: number }) {
  const { size = 0.12, ...rest } = props;
  const geo = useMemo(() => new THREE.CircleGeometry(size, 20), [size]);
  return <mesh geometry={geo} material={blush()} {...rest} />;
}

/** Sonrisa: arco de toroide centrado abajo */
export function Smile({ radius = 0.07, tube = 0.012, arc = Math.PI * 0.7, ...props }: ThreeElements["mesh"] & { radius?: number; tube?: number; arc?: number }) {
  const geo = useMemo(() => new THREE.TorusGeometry(radius, tube, 8, 20, arc), [radius, tube, arc]);
  return <mesh geometry={geo} material={flat(COLORS.mouth)} rotation={[0, 0, -Math.PI / 2 - arc / 2]} {...props} />;
}

/** Dedos redondeados en la punta de las patas */
export function Toes({ r = 0.04, spread = 0.07, ...props }: ThreeElements["group"] & { r?: number; spread?: number }) {
  const geo = useMemo(() => new THREE.SphereGeometry(r, 10, 8), [r]);
  return (
    <group {...props}>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} geometry={geo} material={skin_toe()} position={[i * spread, 0, Math.abs(i) ? -r * 0.4 : 0]} />
      ))}
    </group>
  );
}
function skin_toe() {
  return flatLit(COLORS.toe);
}
const litCache = new Map<string, THREE.MeshStandardMaterial>();
export function flatLit(color: string) {
  let m = litCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    litCache.set(color, m);
  }
  return m;
}

/** "Zzz" flotando cuando un dinosaurio duerme */
export function Zzz({ active, ...props }: ThreeElements["group"] & { active: boolean }) {
  const refs = useRef<THREE.Sprite[]>([]);
  const material = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.font = "700 52px 'Fredoka Variable', Fredoka, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 8;
    g.strokeStyle = "#21372B";
    g.strokeText("z", 32, 34);
    g.fillStyle = "#FFFCF5";
    g.fillText("z", 32, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  }, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const p = (t * 0.35 + i / 3) % 1;
      sp.position.set(Math.sin(p * 6 + i) * 0.08 + p * 0.25, p * 0.7, 0);
      const sc = (0.08 + p * 0.14) * (active ? 1 : 0);
      sp.scale.setScalar(sc);
      sp.material.opacity = active ? Math.sin(p * Math.PI) : 0;
    });
  });
  return (
    <group {...props}>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => void (refs.current[i] = el!)} material={material.clone()} />
      ))}
    </group>
  );
}

/** Ayuda para cursores de "mano" al pasar sobre un personaje */
export function pointerHandlers(onPoke?: () => void) {
  return {
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onPoke?.();
    },
  };
}
