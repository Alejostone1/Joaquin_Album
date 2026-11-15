"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS, skin } from "./materials";
import { Cheek, Eye, lookAtTarget, pointerHandlers, Smile, Toes, useBlink, useCelebrate, type DinoProps } from "./rig";

const C = COLORS.ptero;

function wingGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.07);
  s.quadraticCurveTo(0.3, 0.16, 0.62, 0.04); // borde de ataque
  s.quadraticCurveTo(0.42, -0.02, 0.36, -0.12);
  s.quadraticCurveTo(0.26, -0.06, 0.18, -0.17);
  s.quadraticCurveTo(0.08, -0.1, 0, -0.1);
  s.lineTo(0, 0.07);
  const g = new THREE.ShapeGeometry(s, 16);
  g.rotateX(Math.PI / 2);
  // ligera curvatura de la membrana
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, Math.sin((x / 0.62) * Math.PI) * 0.03);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Pterodáctilo pequeño — alas verdes claras, cresta amarilla.
 * Acciones: "fly" (aleteo), "perch" (posado, alas plegadas), "idle".
 */
export function Pterodactyl({ action = "fly", look = "pointer", celebrateKey, onPoke, shadows = true, groupRef, ...props }: DinoProps) {
  const root = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);
  const legs = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.Group[]>([]);
  const blink = useBlink();
  const celebrate = useCelebrate(celebrateKey);

  const geo = useMemo(
    () => ({
      body: new THREE.SphereGeometry(0.17, 28, 20),
      head: new THREE.SphereGeometry(0.17, 30, 22),
      beak: new THREE.ConeGeometry(0.075, 0.3, 18),
      crest: new THREE.ConeGeometry(0.05, 0.24, 14),
      wing: wingGeometry(),
      bone: new THREE.CapsuleGeometry(0.018, 0.5, 4, 8),
      leg: new THREE.CapsuleGeometry(0.03, 0.08, 4, 8),
    }),
    [],
  );
  const mat = useMemo(() => {
    const wing = skin(C.wing, { spots: "#9CCB86", seed: 31, density: 0.4, rough: 0.7 }).clone();
    wing.side = THREE.DoubleSide;
    return {
      body: skin(C.body, { spots: C.spots, seed: 17, density: 0.7 }),
      belly: skin(C.belly),
      beak: skin("#F4E3C1", { rough: 0.45 }),
      crest: skin(C.crest, { rough: 0.5 }),
      wing,
      bone: skin("#7DB86A"),
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const cel = celebrate.progress(t, 1.2);
    const flying = action === "fly" || cel >= 0;
    const flap = flying ? Math.sin(t * (cel >= 0 ? 16 : 9)) * 0.75 : 0;
    const fold = flying ? 1 : 0.38;
    wingR.current.rotation.z = THREE.MathUtils.damp(wingR.current.rotation.z, flying ? flap + 0.1 : -0.55, 18, delta);
    wingL.current.rotation.z = -wingR.current.rotation.z;
    wingR.current.scale.x = THREE.MathUtils.damp(wingR.current.scale.x, fold, 6, delta);
    wingL.current.scale.x = -wingR.current.scale.x;
    // el cuerpo sube y baja con el aleteo
    root.current.position.y = flying ? -Math.sin(t * 9) * 0.04 + (cel >= 0 ? Math.sin(cel * Math.PI) * 0.6 : 0) : 0;
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, flying ? 0.12 : -0.05, 4, delta);
    if (cel >= 0) root.current.rotation.z = cel * Math.PI * 2; // voltereta
    else root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, 0, 6, delta);
    legs.current.rotation.x = THREE.MathUtils.damp(legs.current.rotation.x, flying ? 1.1 : 0, 6, delta);

    if (flying) {
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, 0, 4, delta);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, -0.1, 4, delta);
    } else lookAtTarget(head.current, state, look, delta, { yaw: 1, pitch: 0.5 });
    const eyeY = cel >= 0 ? 0.35 : blink(t);
    eyes.current.forEach((e) => e && (e.scale.y = THREE.MathUtils.damp(e.scale.y, eyeY, 30, delta)));
  });

  const cast = shadows;
  return (
    <group ref={groupRef} {...props}>
      <group ref={root} {...pointerHandlers(onPoke)}>
        <group position={[0, 0.3, 0]}>
          <mesh geometry={geo.body} material={mat.body} scale={[1, 1.05, 1.35]} castShadow={cast} />
          <mesh geometry={geo.body} material={mat.belly} position={[0, -0.04, 0.04]} scale={[0.8, 0.85, 1.15]} />
          {/* alas */}
          <group ref={wingR} position={[0.11, 0.06, 0.02]}>
            <mesh geometry={geo.wing} material={mat.wing} castShadow={cast} />
            <mesh geometry={geo.bone} material={mat.bone} position={[0.3, 0.01, 0.065]} rotation={[0, 0, Math.PI / 2]} />
          </group>
          <group ref={wingL} position={[-0.11, 0.06, 0.02]} scale={[-1, 1, 1]}>
            <mesh geometry={geo.wing} material={mat.wing} castShadow={cast} />
            <mesh geometry={geo.bone} material={mat.bone} position={[0.3, 0.01, 0.065]} rotation={[0, 0, Math.PI / 2]} />
          </group>
          {/* cabeza */}
          <group ref={head} position={[0, 0.17, 0.2]}>
            <mesh geometry={geo.head} material={mat.body} castShadow={cast} />
            <mesh geometry={geo.beak} material={mat.beak} position={[0, -0.04, 0.24]} rotation={[Math.PI / 2 + 0.12, 0, 0]} scale={[1, 1, 0.7]} />
            <mesh geometry={geo.crest} material={mat.crest} position={[0, 0.1, -0.16]} rotation={[-2.1, 0, 0]} />
            <Eye size={0.06} position={[-0.09, 0.04, 0.12]} rotation={[0, -0.45, 0]} eyeRef={(el) => void (eyes.current[0] = el!)} />
            <Eye size={0.06} position={[0.09, 0.04, 0.12]} rotation={[0, 0.45, 0]} eyeRef={(el) => void (eyes.current[1] = el!)} />
            <Cheek size={0.05} position={[-0.13, -0.04, 0.09]} rotation={[0, -0.9, 0]} />
            <Cheek size={0.05} position={[0.13, -0.04, 0.09]} rotation={[0, 0.9, 0]} />
            <Smile radius={0.035} tube={0.008} position={[0, -0.075, 0.16]} />
          </group>
          {/* patas */}
          <group ref={legs} position={[0, -0.12, -0.02]}>
            {[-0.07, 0.07].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh geometry={geo.leg} material={mat.body} position={[0, -0.06, 0]} />
                <Toes r={0.018} spread={0.025} position={[0, -0.13, 0.03]} />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
