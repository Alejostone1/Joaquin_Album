"use client";

import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Sfx } from "@/components/audio/engine";
import { BabyDino } from "./BabyDino";
import { softDot } from "./materials";
import { groundHeight, PERCH, seededRandom } from "./Forest";
import { Pterodactyl } from "./Pterodactyl";
import type { DinoAction, LookMode } from "./rig";
import { Stegosaurus } from "./Stegosaurus";
import { Triceratops } from "./Triceratops";

export type IntroPhase = "idle" | "flying" | "title" | "ready" | "exiting";

type Props = {
  start: boolean;
  skip: boolean;
  exitKey: number;
  shadows: boolean;
  onPhase: (p: IntroPhase) => void;
  onExited: () => void;
  sfx: (s: Sfx) => void;
};

// Recorrido cinematográfico: sobre las nubes → atraviesa las nubes → sobre el dosel → entre helechos → al claro
const CAM_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(12, 38, 62),
    new THREE.Vector3(7, 24, 46),
    new THREE.Vector3(2, 10.5, 30),
    new THREE.Vector3(7.5, 6.2, 20),
    new THREE.Vector3(1.5, 2.6, 13.5),
    new THREE.Vector3(-2.2, 1.55, 9.6),
    new THREE.Vector3(0.1, 1.45, 6.6),
  ],
  false,
  "centripetal",
);
const LOOK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4, 22, -10),
  new THREE.Vector3(-2, 10, -12),
  new THREE.Vector3(0, 3.5, -8),
  new THREE.Vector3(-1, 2.2, -6),
  new THREE.Vector3(-2.2, 1.1, -1.5),
  new THREE.Vector3(-1.6, 0.9, -0.8),
  new THREE.Vector3(0, 0.95, 0),
]);
const FINAL_LOOK = LOOK_PATH.getPoint(1);

const STEGO_FROM = new THREE.Vector3(-3.7, 0, -2.4);
const STEGO_TO = new THREE.Vector3(-0.1, 0, 0.15);

export function IntroScene({ start, skip, exitKey, shadows, onPhase, onExited, sfx }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const stego = useRef<THREE.Group>(null!);
  const progress = useRef({ cam: 0, look: 0 });
  const phase = useRef<IntroPhase>("idle");
  const lookTarget = useRef(FINAL_LOOK.clone());
  const [stegoAction, setStegoAction] = useState<DinoAction>("idle");
  const [stegoLook, setStegoLook] = useState<LookMode>("none");
  const [stegoCel, setStegoCel] = useState(0);
  const [triceAction, setTriceAction] = useState<DinoAction>("sleep");
  const [triceCel, setTriceCel] = useState(0);
  const [pteroCel, setPteroCel] = useState(0);
  const [hatched, setHatched] = useState<Record<string, boolean>>({});
  const [flyKey, setFlyKey] = useState(0);
  const shake = useRef(0);
  const triceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exitTl = useRef<gsap.core.Timeline | null>(null);

  const setPhase = (p: IntroPhase) => {
    phase.current = p;
    onPhase(p);
  };

  // posición inicial: el estegosaurio escondido entre los helechos
  useEffect(() => {
    stego.current.position.copy(STEGO_FROM);
    stego.current.rotation.y = Math.atan2(STEGO_TO.x - STEGO_FROM.x, STEGO_TO.z - STEGO_FROM.z);
    camera.position.copy(CAM_PATH.getPoint(0));
    camera.lookAt(LOOK_PATH.getPoint(0));
  }, [camera]);

  // la película
  useEffect(() => {
    if (!start) return;
    const s = stego.current;
    if (skip) {
      progress.current.cam = 1;
      progress.current.look = 1;
      s.position.copy(STEGO_TO);
      s.rotation.y = 0.72;
      setStegoAction("idle");
      setStegoLook("pointer");
      setPhase("title");
      setHatched((h) => ({ ...h, main: true }));
      const id = setTimeout(() => setPhase("ready"), 900);
      return () => clearTimeout(id);
    }
    setPhase("flying");
    const tl = gsap.timeline();
    tl.to(progress.current, { cam: 1, look: 1, duration: 13.5, ease: "power2.inOut" }, 0);
    tl.call(() => sfx("whoosh"), [], 0.8);
    // un pterodáctilo pasa rozando la cámara
    tl.call(() => {
      setFlyKey((k) => k + 1);
      sfx("flap");
    }, [], 3.4);
    tl.call(() => sfx("flap"), [], 6.2);
    // aparece entre la vegetación
    tl.call(() => setStegoAction("walk"), [], 8.6);
    tl.to(s.position, { x: STEGO_TO.x, z: STEGO_TO.z, duration: 3.6, ease: "sine.inOut" }, 8.6);
    tl.call(() => {
      setStegoAction("idle");
      setStegoLook("camera");
    }, [], 12.2);
    // gira hacia la cámara, la mira y ruge (la cámara tiembla un poco)
    tl.to(s.rotation, { y: 0.72, duration: 0.9, ease: "back.out(2)" }, 12.2);
    tl.call(() => {
      sfx("rawr");
      shake.current = 0.09;
    }, [], 12.9);
    tl.call(() => setStegoCel((k) => k + 1), [], 13.0);
    tl.call(() => {
      sfx("chime");
      setPhase("title");
      // el huevo se abre justo cuando aparece el nombre
      setHatched((h) => ({ ...h, main: true }));
      setTimeout(() => sfx("sparkle"), 300);
    }, [], 13.6);
    tl.call(() => {
      setStegoLook("pointer");
      setPhase("ready");
    }, [], 15.4);
    return () => {
      tl.kill();
    };
  }, [start, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  // salida: la cámara se acerca al estegosaurio y entra en su mundo
  useEffect(() => {
    if (!exitKey) return;
    setPhase("exiting");
    sfx("whoosh");
    setStegoCel((k) => k + 1);
    const from = camera.position.clone();
    const p = { k: 0 };
    exitTl.current?.kill();
    exitTl.current = gsap.timeline({ onComplete: onExited });
    exitTl.current.to(p, {
      k: 1,
      duration: 1.6,
      ease: "power3.in",
      onUpdate: () => {
        camera.position.lerpVectors(from, new THREE.Vector3(0, 1.2, 1.5), p.k);
        camera.fov = 40 + p.k * 25;
        camera.updateProjectionMatrix();
      },
    });
  }, [exitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    if (phase.current === "exiting") {
      camera.lookAt(0, 0.9, 0);
      return;
    }
    // pantallas verticales (móvil): abrir el lente para que quepa la escena
    const aspect = state.size.width / Math.max(1, state.size.height);
    const fov = aspect < 1 ? Math.min(66, 40 + (1 - aspect) * 48) : 40;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 6, delta);
      camera.updateProjectionMatrix();
    }
    const k = progress.current.cam;
    const pos = CAM_PATH.getPoint(Math.min(1, k));
    const look = LOOK_PATH.getPoint(Math.min(1, progress.current.look));
    if (phase.current === "title" || phase.current === "ready") {
      // deriva suave + parallax con el cursor
      const t = state.clock.elapsedTime;
      pos.x += state.pointer.x * 0.45 + Math.sin(t * 0.25) * 0.12;
      pos.y += state.pointer.y * 0.18 + Math.sin(t * 0.33) * 0.05;
    }
    if (shake.current > 0.001) {
      pos.x += (Math.random() - 0.5) * shake.current;
      pos.y += (Math.random() - 0.5) * shake.current;
      shake.current *= Math.exp(-5 * delta);
    }
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, 4, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, 4, delta);
    lookTarget.current.lerp(look, 1 - Math.exp(-6 * delta));
    camera.lookAt(lookTarget.current);
  });

  const pokeTrice = () => {
    sfx("rawr");
    clearTimeout(triceTimer.current);
    setTriceAction("idle");
    setTriceCel((k) => k + 1);
    triceTimer.current = setTimeout(() => setTriceAction("sleep"), 9000);
  };
  const hatch = (id: string) => {
    if (hatched[id]) return;
    sfx("pop");
    setTimeout(() => sfx("sparkle"), 250);
    setHatched((h) => ({ ...h, [id]: true }));
  };

  const triceY = groundHeight(2.9, -0.9);
  return (
    <group>
      <CloudPass />
      <FlybyPtero flyKey={flyKey} shadows={false} />
      <Stegosaurus
        groupRef={stego}
        action={stegoAction}
        look={stegoLook}
        celebrateKey={stegoCel}
        shadows={shadows}
        onPoke={() => {
          sfx("rawr");
          setStegoCel((k) => k + 1);
        }}
      />
      <Triceratops position={[2.9, triceY, -0.9]} rotation={[0, -0.9, 0]} scale={0.95} action={triceAction} celebrateKey={triceCel} shadows={shadows} onPoke={pokeTrice} />
      <FlyingPtero shadows={shadows} celebrateKey={pteroCel} onPoke={() => {
        sfx("flap");
        setPteroCel((k) => k + 1);
      }} />
      {/* huevo principal, junto al claro */}
      <BabyDino position={[1.35, groundHeight(1.35, 1.1), 1.1]} rotation={[0, -0.5, 0]} scale={0.62} hatched={!!hatched.main} onHatch={() => hatch("main")} shadows={shadows} />
      {/* nido con huevos rosados (como el colgante) */}
      <Nest position={[-1.75, groundHeight(-1.75, 1.9), 1.9]} />
      <BabyDino position={[-1.88, groundHeight(-1.75, 1.9) + 0.05, 1.85]} rotation={[0, 0.4, 0.05]} scale={0.38}
        eggColor={{ base: "#F4CDBE", a: "#E2A58F", b: "#D98F7A" }} bodyColor="#BFE3F5"
        hatched={!!hatched.a} onHatch={() => hatch("a")} shadows={shadows} />
      <BabyDino position={[-1.55, groundHeight(-1.75, 1.9) + 0.05, 2.05]} rotation={[0, -0.3, -0.06]} scale={0.34}
        eggColor={{ base: "#F6D9C8", a: "#E6B09A", b: "#9CC9A6" }} bodyColor="#D7EDA4"
        hatched={!!hatched.b} onHatch={() => hatch("b")} shadows={shadows} />
    </group>
  );
}

function Nest(props: { position: [number, number, number] }) {
  const twigs = useMemo(() => {
    const rand = seededRandom(66);
    return Array.from({ length: 16 }, (_, i) => ({
      a: (i / 16) * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.6,
      r: 0.36 + rand() * 0.06,
      y: 0.06 + rand() * 0.08,
    }));
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.12, 10, 28]} />
        <meshStandardMaterial color="#9C7A55" roughness={1} />
      </mesh>
      {twigs.map((t, i) => (
        <mesh key={i} position={[Math.cos(t.a) * t.r, t.y, Math.sin(t.a) * t.r]} rotation={[t.tilt, -t.a, Math.PI / 2]}>
          <capsuleGeometry args={[0.018, 0.36, 3, 6]} />
          <meshStandardMaterial color={i % 2 ? "#7D5E3E" : "#B08C63"} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 20]} />
        <meshStandardMaterial color="#7FB061" roughness={1} />
      </mesh>
    </group>
  );
}

const FLY_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-7, 4.2, -6),
    new THREE.Vector3(0, 5.6, -10),
    new THREE.Vector3(7.5, 4.6, -5),
    new THREE.Vector3(6.5, 3.6, 3),
    new THREE.Vector3(0.5, 4.4, 5),
    new THREE.Vector3(-6.5, 3.8, 1),
  ],
  true,
);

/** Pterodáctilo que vuela entre los árboles y de vez en cuando se posa en la roca. */
function FlyingPtero({ shadows, celebrateKey, onPoke }: { shadows: boolean; celebrateKey: number; onPoke: () => void }) {
  const ref = useRef<THREE.Group>(null!);
  const [action, setAction] = useState<DinoAction>("fly");
  const perch = useMemo(() => new THREE.Vector3(PERCH.x, groundHeight(PERCH.x, PERCH.z) + 0.2 + PERCH.s * 0.68, PERCH.z), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), tan: new THREE.Vector3() }), []);
  const cycle = 32;
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const c = t % cycle;
    const u = ((t * 0.032) % 1 + 1) % 1;
    FLY_PATH.getPointAt(u, tmp.a);
    FLY_PATH.getTangentAt(u, tmp.tan);
    let next: DinoAction = "fly";
    const g = ref.current;
    if (c < 20) {
      g.position.copy(tmp.a);
      g.rotation.y = Math.atan2(tmp.tan.x, tmp.tan.z);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -tmp.tan.x * 0.3, 3, delta);
    } else if (c < 22.5) {
      const k = THREE.MathUtils.smootherstep(c, 20, 22.5);
      g.position.lerpVectors(g.position, perch, k * 0.2 + 0.02);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.atan2(perch.x - g.position.x, perch.z - g.position.z), 4, delta);
      if (k > 0.9) next = "perch";
    } else if (c < 29.5) {
      g.position.copy(perch);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0.6, 3, delta);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0, 4, delta);
      next = "perch";
    } else {
      const k = THREE.MathUtils.smootherstep(c, 29.5, cycle);
      FLY_PATH.getPointAt((((t + (cycle - c)) * 0.032) % 1 + 1) % 1, tmp.b);
      g.position.lerpVectors(perch, tmp.b, k);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.atan2(tmp.b.x - perch.x, tmp.b.z - perch.z), 4, delta);
    }
    if (next !== action) setAction(next);
  });
  return <Pterodactyl groupRef={ref} action={action} celebrateKey={celebrateKey} onPoke={onPoke} shadows={shadows} scale={1.15} />;
}

/** Nubes que la cámara atraviesa al comienzo de la película. */
function CloudPass() {
  const camera = useThree((st) => st.camera);
  const sprites = useRef<THREE.Sprite[]>([]);
  const items = useMemo(() => {
    const rand = seededRandom(2024);
    return Array.from({ length: 26 }, () => {
      const u = 0.04 + rand() * 0.3;
      const p = CAM_PATH.getPoint(u);
      return { pos: new THREE.Vector3(p.x + (rand() - 0.5) * 16, p.y + (rand() - 0.5) * 6 - 1, p.z + (rand() - 0.5) * 10), s: 5 + rand() * 9 };
    });
  }, []);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), color: "#ffffff", transparent: true, depthWrite: false, fog: false, opacity: 0.9 }), []);
  useFrame(() => {
    sprites.current.forEach((sp, i) => {
      if (!sp) return;
      const d = sp.position.distanceTo(camera.position);
      // se desvanecen al tocar la cámara para evitar un fogonazo blanco
      (sp.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp((d - 1.5) / 7, 0, 1) * 0.85 * (camera.position.y > 9 ? 1 : 0);
      sp.scale.setScalar(items[i].s);
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <sprite key={i} ref={(el) => void (sprites.current[i] = el!)} position={it.pos} material={mat.clone()} />
      ))}
    </group>
  );
}

/** Pterodáctilo que cruza frente a la cámara durante el vuelo inicial. */
function FlybyPtero({ flyKey, shadows }: { flyKey: number; shadows: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const camera = useThree((st) => st.camera);
  const anim = useRef<{ t0: number; from: THREE.Vector3; to: THREE.Vector3 } | null>(null);
  const clock = useThree((st) => st.clock);
  useEffect(() => {
    if (!flyKey) return;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const base = camera.position.clone().addScaledVector(fwd, 7);
    anim.current = {
      t0: clock.elapsedTime,
      from: base.clone().addScaledVector(right, -11).add(new THREE.Vector3(0, 1.2, 0)),
      to: base.clone().addScaledVector(right, 12).add(new THREE.Vector3(0, -1.5, 0)).addScaledVector(fwd, -2),
    };
  }, [flyKey, camera, clock]);
  useFrame((state) => {
    const a = anim.current;
    const g = ref.current;
    if (!a) {
      g.visible = false;
      return;
    }
    const k = (state.clock.elapsedTime - a.t0) / 2.6;
    if (k > 1) {
      g.visible = false;
      anim.current = null;
      return;
    }
    g.visible = true;
    const e = k * k * (3 - 2 * k);
    g.position.lerpVectors(a.from, a.to, e);
    g.position.y += Math.sin(k * Math.PI) * 1.2;
    const dir = a.to.clone().sub(a.from);
    g.rotation.set(0, Math.atan2(dir.x, dir.z), -0.25);
  });
  return (
    <group ref={ref} visible={false}>
      <Pterodactyl action="fly" look="none" shadows={shadows} scale={2.2} />
    </group>
  );
}
