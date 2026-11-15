"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS, skin } from "./materials";
import { Cheek, Eye, lookAtTarget, pointerHandlers, Smile, Toes, useBlink, useCelebrate, Zzz, type DinoProps } from "./rig";

const C = COLORS.stego;

/** Placa dorsal redondeada en forma de rombo */
function plateGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.2, 0.12, 0.13, 0.3);
  s.quadraticCurveTo(0.06, 0.42, 0, 0.46);
  s.quadraticCurveTo(-0.06, 0.42, -0.13, 0.3);
  s.quadraticCurveTo(-0.2, 0.12, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -0.0175);
  g.rotateY(Math.PI / 2); // plano a lo largo de la columna
  return g;
}

/**
 * Estegosaurio bebé — inspirado en el colgante de la habitación:
 * cuerpo verde claro con manchas, placas dorsales, ojos grandes y mejillas rosadas.
 */
export function Stegosaurus({ action = "idle", look = "pointer", celebrateKey, onPoke, shadows = true, groupRef, ...props }: DinoProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group[]>([]);
  const legs = useRef<THREE.Group[]>([]);
  const eyes = useRef<THREE.Group[]>([]);
  const blink = useBlink();
  const celebrate = useCelebrate(celebrateKey);

  const geo = useMemo(
    () => ({
      body: new THREE.SphereGeometry(0.5, 40, 30),
      head: new THREE.SphereGeometry(0.3, 36, 26),
      snout: new THREE.SphereGeometry(0.2, 28, 20),
      neck: new THREE.SphereGeometry(0.22, 24, 18),
      tail: new THREE.SphereGeometry(0.2, 24, 16),
      leg: new THREE.CapsuleGeometry(0.12, 0.2, 6, 14),
      plate: plateGeometry(),
      spike: new THREE.ConeGeometry(0.035, 0.16, 10),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      body: skin(C.body, { spots: C.spots, seed: 4 }),
      head: skin(C.body, { spots: C.spots, seed: 9, density: 0.5 }),
      belly: skin(C.belly, { rough: 0.7 }),
      plate: skin(C.plates, { spots: "#3F7A3C", seed: 2, density: 0.6 }),
      spike: skin("#FFF3D6"),
    }),
    [],
  );

  // placas a lo largo del lomo: dos hileras alternadas, más grandes al centro
  const plates = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; s: number; rx: number }> = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1); // 0 cuello → 1 cola
      const z = 0.42 - u * 1.05;
      const a = (z / 0.68) * (Math.PI / 2);
      const y = 0.62 + 0.47 * Math.cos(THREE.MathUtils.clamp(a, -1.45, 1.45)) - 0.02;
      const s = 0.55 + Math.sin(u * Math.PI) * 0.65;
      out.push({ pos: [i % 2 ? 0.055 : -0.055, y, z], s, rx: -a * 0.55 });
    }
    return out;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sleeping = action === "sleep";
    const cel = celebrate.progress(t);
    const moving = action === "walk" || action === "run";
    const speed = action === "run" ? 13 : 7.5;
    const amp = action === "run" ? 0.75 : 0.5;

    // patas
    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      const target = moving ? Math.sin(t * speed + phase) * amp : sleeping ? (i < 2 ? -1.2 : 1.2) : 0;
      leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, target, 10, delta);
    });

    // cuerpo: respiración, rebote al caminar, salto al celebrar
    let y = 0;
    let squash = 1;
    if (moving) y = Math.abs(Math.sin(t * speed)) * (action === "run" ? 0.07 : 0.035);
    if (cel >= 0) {
      const hop = (cel * 2) % 1;
      y = Math.sin(hop * Math.PI) * 0.45;
      squash = 1 + Math.sin(hop * Math.PI) * 0.06 - (hop < 0.08 || hop > 0.92 ? 0.08 : 0);
      root.current.rotation.y = cel < 0.5 ? cel * 2 * Math.PI * 2 : 0;
    } else {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, 0, 8, delta);
    }
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, y, cel >= 0 ? 30 : 8, delta);
    const sleepDrop = sleeping ? -0.2 : 0;
    body.current.position.y = THREE.MathUtils.damp(body.current.position.y, sleepDrop, 4, delta);
    const breathe = 1 + Math.sin(t * (sleeping ? 1.3 : 2.2)) * 0.018;
    body.current.scale.set(1 / Math.sqrt(squash), breathe * squash, 1 / Math.sqrt(squash));

    // cola: ondulación
    const wagSpeed = cel >= 0 ? 14 : moving ? 6 : sleeping ? 1 : 2.4;
    const wagAmp = cel >= 0 ? 0.45 : sleeping ? 0.05 : 0.18;
    tail.current.forEach((seg, i) => {
      if (!seg) return;
      seg.rotation.y = Math.sin(t * wagSpeed - i * 0.7) * wagAmp;
      seg.rotation.x = cel >= 0 ? -0.15 : sleeping ? 0.15 : 0.05 * Math.sin(t * 1.3 - i);
    });

    // cabeza
    if (sleeping) {
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, 0.45, 3, delta);
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, 0.35, 3, delta);
    } else if (cel >= 0) {
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, -0.35, 10, delta);
    } else {
      lookAtTarget(head.current, state, moving ? "none" : look, delta, { yaw: 0.9, pitch: 0.5 });
      if (moving) head.current.rotation.x += Math.sin(t * speed * 2) * 0.01;
    }

    // ojos
    const eyeY = sleeping ? 0.08 : cel >= 0 ? 0.35 : blink(t);
    eyes.current.forEach((e) => e && (e.scale.y = THREE.MathUtils.damp(e.scale.y, eyeY, 30, delta)));
  });

  const cast = shadows;
  return (
    <group ref={groupRef} {...props}>
      <group ref={root} {...pointerHandlers(onPoke)}>
        <group ref={body}>
          {/* torso */}
          <mesh geometry={geo.body} material={mat.body} position={[0, 0.62, 0]} scale={[0.86, 0.92, 1.32]} castShadow={cast} />
          <mesh geometry={geo.body} material={mat.belly} position={[0, 0.5, 0.06]} scale={[0.74, 0.72, 1.12]} />
          {plates.map((p, i) => (
            <mesh key={i} geometry={geo.plate} material={mat.plate} position={p.pos} rotation={[p.rx, 0, 0]} scale={p.s} castShadow={cast} />
          ))}

          {/* cuello y cabeza */}
          <mesh geometry={geo.neck} material={mat.body} position={[0, 0.78, 0.55]} scale={[1, 1, 1.25]} />
          <group ref={head} position={[0, 0.92, 0.74]}>
            <mesh geometry={geo.head} material={mat.head} scale={[1, 0.94, 1.05]} castShadow={cast} />
            <mesh geometry={geo.snout} material={mat.head} position={[0, -0.07, 0.2]} scale={[1.15, 0.88, 1]} />
            <Eye size={0.085} position={[-0.135, 0.07, 0.22]} rotation={[0, -0.32, 0]} eyeRef={(el) => void (eyes.current[0] = el!)} />
            <Eye size={0.085} position={[0.135, 0.07, 0.22]} rotation={[0, 0.32, 0]} eyeRef={(el) => void (eyes.current[1] = el!)} />
            <Cheek size={0.075} position={[-0.2, -0.06, 0.2]} rotation={[0, -0.75, 0]} />
            <Cheek size={0.075} position={[0.2, -0.06, 0.2]} rotation={[0, 0.75, 0]} />
            <Smile radius={0.06} position={[0, -0.075, 0.385]} />
            <Zzz active={action === "sleep"} position={[0.22, 0.3, 0.1]} />
          </group>

          {/* cola segmentada */}
          <group position={[0, 0.62, -0.6]}>
            <group ref={(el) => void (tail.current[0] = el!)}>
              <mesh geometry={geo.tail} material={mat.body} position={[0, 0, -0.12]} scale={[1.05, 0.95, 1.3]} castShadow={cast} />
              <group position={[0, 0.02, -0.28]} ref={(el) => void (tail.current[1] = el!)}>
                <mesh geometry={geo.tail} material={mat.body} position={[0, 0, -0.1]} scale={[0.75, 0.7, 1.1]} />
                <group position={[0, 0.03, -0.22]} ref={(el) => void (tail.current[2] = el!)}>
                  <mesh geometry={geo.tail} material={mat.body} position={[0, 0, -0.08]} scale={[0.5, 0.48, 0.95]} />
                  <group position={[0, 0.04, -0.17]} ref={(el) => void (tail.current[3] = el!)}>
                    <mesh geometry={geo.tail} material={mat.body} position={[0, 0, -0.04]} scale={[0.32, 0.3, 0.6]} />
                    {[-1, 1].map((sx) => (
                      <group key={sx}>
                        <mesh geometry={geo.spike} material={mat.spike} position={[sx * 0.07, 0.07, -0.02]} rotation={[-0.4, 0, -sx * 0.9]} />
                        <mesh geometry={geo.spike} material={mat.spike} position={[sx * 0.06, 0.07, -0.12]} rotation={[-0.7, 0, -sx * 0.8]} />
                      </group>
                    ))}
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* patas (pivote arriba) */}
        {[
          [-0.27, 0.42, 0.33],
          [0.27, 0.42, 0.33],
          [-0.27, 0.42, -0.33],
          [0.27, 0.42, -0.33],
        ].map((p, i) => (
          <group key={i} position={p as [number, number, number]} ref={(el) => void (legs.current[i] = el!)}>
            <mesh geometry={geo.leg} material={mat.body} position={[0, -0.2, 0]} castShadow={cast} />
            <Toes r={0.035} spread={0.055} position={[0, -0.39, 0.09]} />
          </group>
        ))}
      </group>
    </group>
  );
}
