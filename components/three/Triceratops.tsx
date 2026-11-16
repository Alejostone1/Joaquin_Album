"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS, skin } from "./materials";
import { Cheek, Eye, lookAtTarget, pointerHandlers, Smile, Toes, useBlink, useCelebrate, Zzz, type DinoProps } from "./rig";

const C = COLORS.trice;

/**
 * Triceratops bebé — verde suave, volumen redondeado, gola festoneada
 * y tres cuernitos color crema. Expresión tierna.
 */
export function Triceratops({ action = "idle", look = "pointer", celebrateKey, onPoke, shadows = true, groupRef, flower = false, ...props }: DinoProps & { flower?: boolean }) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const legs = useRef<THREE.Group[]>([]);
  const eyes = useRef<THREE.Group[]>([]);
  const blink = useBlink();
  const celebrate = useCelebrate(celebrateKey);

  const geo = useMemo(
    () => ({
      body: new THREE.SphereGeometry(0.5, 40, 30),
      head: new THREE.SphereGeometry(0.34, 36, 26),
      snout: new THREE.SphereGeometry(0.2, 28, 20),
      frill: new THREE.CylinderGeometry(0.46, 0.4, 0.07, 36, 1),
      scallop: new THREE.SphereGeometry(0.075, 14, 10),
      frillSpot: new THREE.CircleGeometry(0.05, 14),
      horn: new THREE.ConeGeometry(0.055, 0.2, 14),
      noseHorn: new THREE.ConeGeometry(0.045, 0.11, 12),
      leg: new THREE.CapsuleGeometry(0.13, 0.16, 6, 14),
      tail: new THREE.SphereGeometry(0.18, 20, 14),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      body: skin(C.body, { spots: C.spots, seed: 12 }),
      head: skin(C.body, { spots: C.spots, seed: 21, density: 0.45 }),
      belly: skin(C.belly, { rough: 0.7 }),
      frill: skin(C.frill, { spots: "#5F9A53", seed: 5, density: 0.5 }),
      scallop: skin("#B9E2A8"),
      horn: skin(C.horn, { rough: 0.45 }),
      spot: skin("#5F9A53"),
    }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sleeping = action === "sleep";
    const moving = action === "walk" || action === "run";
    const cel = celebrate.progress(t, 1.1);
    const speed = action === "run" ? 12 : 7;

    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      const target = moving ? Math.sin(t * speed + phase) * 0.5 : sleeping ? (i < 2 ? -1.3 : 1.3) : 0;
      leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, target, 10, delta);
    });

    let y = moving ? Math.abs(Math.sin(t * speed)) * 0.03 : 0;
    if (cel >= 0) y = Math.sin(((cel * 3) % 1) * Math.PI) * 0.28;
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, y, cel >= 0 ? 30 : 8, delta);
    body.current.position.y = THREE.MathUtils.damp(body.current.position.y, sleeping ? -0.2 : 0, 4, delta);
    const breathe = 1 + Math.sin(t * (sleeping ? 1.2 : 2)) * 0.02;
    body.current.scale.set(1, breathe, 1);
    // balanceo de lado a lado al celebrar
    body.current.rotation.z = cel >= 0 ? Math.sin(cel * Math.PI * 6) * 0.12 : THREE.MathUtils.damp(body.current.rotation.z, 0, 6, delta);

    tail.current.rotation.y = Math.sin(t * (cel >= 0 ? 12 : moving ? 6 : 2)) * (sleeping ? 0.05 : 0.3);

    if (sleeping) {
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, 0.4, 3, delta);
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, -0.3, 3, delta);
    } else if (cel >= 0) {
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, -0.3, 10, delta);
      head.current.rotation.y = Math.sin(cel * Math.PI * 4) * 0.25;
    } else {
      lookAtTarget(head.current, state, moving ? "none" : look, delta, { yaw: 0.8, pitch: 0.4 });
    }

    const eyeY = sleeping ? 0.08 : cel >= 0 ? 0.35 : blink(t);
    eyes.current.forEach((e) => e && (e.scale.y = THREE.MathUtils.damp(e.scale.y, eyeY, 30, delta)));
  });

  const scallops = useMemo(() => Array.from({ length: 11 }, (_, i) => -Math.PI * 0.95 + (i / 10) * Math.PI * 1.9), []);
  const cast = shadows;

  return (
    <group ref={groupRef} {...props}>
      <group ref={root} {...pointerHandlers(onPoke)}>
        <group ref={body}>
          <mesh geometry={geo.body} material={mat.body} position={[0, 0.58, -0.05]} scale={[0.95, 0.88, 1.18]} castShadow={cast} />
          <mesh geometry={geo.body} material={mat.belly} position={[0, 0.46, 0.02]} scale={[0.8, 0.7, 1.02]} />

          <group ref={head} position={[0, 0.82, 0.58]}>
            {/* gola */}
            <group position={[0, 0.12, -0.16]} rotation={[-1.05, 0, 0]}>
              <mesh geometry={geo.frill} material={mat.frill} castShadow={cast} />
              {scallops.map((a, i) => (
                <mesh key={i} geometry={geo.scallop} material={mat.scallop} position={[Math.sin(a) * 0.44, 0.0, -Math.cos(a) * 0.44]} scale={[1, 0.6, 1]} />
              ))}
              {[-0.2, 0, 0.2].map((x, i) => (
                <mesh key={i} geometry={geo.frillSpot} material={mat.spot} position={[x, 0.04, -0.24 + Math.abs(x) * 0.4]} rotation={[-Math.PI / 2, 0, 0]} />
              ))}
            </group>
            <mesh geometry={geo.head} material={mat.head} scale={[1, 0.92, 1]} castShadow={cast} />
            <mesh geometry={geo.snout} material={mat.head} position={[0, -0.1, 0.24]} scale={[1.05, 0.85, 1]} />
            {/* cuernos */}
            <mesh geometry={geo.horn} material={mat.horn} position={[-0.13, 0.25, 0.12]} rotation={[0.75, 0, 0.18]} />
            <mesh geometry={geo.horn} material={mat.horn} position={[0.13, 0.25, 0.12]} rotation={[0.75, 0, -0.18]} />
            <mesh geometry={geo.noseHorn} material={mat.horn} position={[0, 0.04, 0.4]} rotation={[0.5, 0, 0]} />
            <Eye size={0.09} position={[-0.14, 0.06, 0.25]} rotation={[0, -0.3, 0]} eyeRef={(el) => void (eyes.current[0] = el!)} />
            <Eye size={0.09} position={[0.14, 0.06, 0.25]} rotation={[0, 0.3, 0]} eyeRef={(el) => void (eyes.current[1] = el!)} />
            <Cheek size={0.08} position={[-0.22, -0.07, 0.22]} rotation={[0, -0.75, 0]} />
            <Cheek size={0.08} position={[0.22, -0.07, 0.22]} rotation={[0, 0.75, 0]} />
            <Smile radius={0.065} position={[0, -0.1, 0.425]} arc={Math.PI * 0.8} />
            <Zzz active={action === "sleep"} position={[0.25, 0.35, 0]} />
            {flower && <Flower position={[0.2, 0.3, -0.02]} rotation={[0.3, 0, -0.4]} />}
          </group>

          <group ref={tail} position={[0, 0.55, -0.62]}>
            <mesh geometry={geo.tail} material={mat.body} position={[0, -0.02, -0.12]} scale={[1, 0.9, 1.4]} />
            <mesh geometry={geo.tail} material={mat.body} position={[0, -0.06, -0.32]} scale={[0.55, 0.5, 0.95]} />
          </group>
        </group>

        {[
          [-0.3, 0.36, 0.3],
          [0.3, 0.36, 0.3],
          [-0.3, 0.36, -0.36],
          [0.3, 0.36, -0.36],
        ].map((p, i) => (
          <group key={i} position={p as [number, number, number]} ref={(el) => void (legs.current[i] = el!)}>
            <mesh geometry={geo.leg} material={mat.body} position={[0, -0.18, 0]} castShadow={cast} />
            <Toes r={0.038} spread={0.06} position={[0, -0.33, 0.1]} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** Florecita rosada en la gola (Mamá). */
function Flower(props: { position: [number, number, number]; rotation: [number, number, number] }) {
  const mats = useMemo(() => ({ petal: skin("#FF8FB1", { rough: 0.5 }), center: skin("#FFD23F", { rough: 0.5 }) }), []);
  return (
    <group {...props}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} material={mats.petal} position={[Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0]} scale={[1, 1, 0.45]}>
            <sphereGeometry args={[0.05, 14, 10]} />
          </mesh>
        );
      })}
      <mesh material={mats.center} position={[0, 0, 0.02]} scale={[1, 1, 0.6]}>
        <sphereGeometry args={[0.04, 14, 10]} />
      </mesh>
    </group>
  );
}
