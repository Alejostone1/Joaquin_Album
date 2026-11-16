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
    new THREE.Vector3(0.1, 1.35, 5.6),
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
  new THREE.Vector3(0, 1.3, 0.2),
]);
const FINAL_LOOK = LOOK_PATH.getPoint(1);

// Papá (estegosaurio) llega desde los helechos; Mamá (triceratops) duerme junto al huevo de Joaquín
const STEGO_FROM = new THREE.Vector3(-3.7, 0, -2.4);
const STEGO_TO = new THREE.Vector3(-1.05, 0, 0.0);
const MAMA_POS = new THREE.Vector3(1.05, 0, -0.1);
const EGG_POS = new THREE.Vector3(0, 0, 1.25);
const faceY = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

export function IntroScene({ start, skip, exitKey, shadows, onPhase, onExited, sfx }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const stego = useRef<THREE.Group>(null!);
  const mama = useRef<THREE.Group>(null!);
  const [triceLook, setTriceLook] = useState<LookMode>("none");
  const [hearts, setHearts] = useState(0);
  const [labels, setLabels] = useState(false);
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
    mama.current.position.set(MAMA_POS.x, groundHeight(MAMA_POS.x, MAMA_POS.z), MAMA_POS.z);
    mama.current.rotation.y = -0.55;
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
      s.rotation.y = faceY(STEGO_TO, EGG_POS);
      mama.current.rotation.y = faceY(MAMA_POS, EGG_POS);
      setTriceAction("idle");
      setTriceLook("pointer");
      setLabels(true);
      setStegoAction("idle");
      setStegoLook("pointer");
      setPhase("title");
      setHatched((h) => ({ ...h, main: true }));
      const id = setTimeout(() => setPhase("ready"), 900);
      return () => clearTimeout(id);
    }
    setPhase("flying");
    const m = mama.current;
    const tl = gsap.timeline();
    tl.to(progress.current, { cam: 1, look: 1, duration: 11.6, ease: "power2.inOut" }, 0);
    tl.call(() => sfx("whoosh"), [], 0.8);
    // un pterodáctilo pasa rozando la cámara
    tl.call(() => {
      setFlyKey((k) => k + 1);
      sfx("flap");
    }, [], 3.4);
    tl.call(() => sfx("flap"), [], 6.2);
    // Papá aparece entre la vegetación y camina hacia Mamá
    tl.call(() => setStegoAction("walk"), [], 7.2);
    tl.to(s.position, { x: STEGO_TO.x, z: STEGO_TO.z, duration: 3.4, ease: "sine.inOut" }, 7.2);
    tl.to(s.rotation, { y: faceY(STEGO_TO, MAMA_POS), duration: 0.8, ease: "sine.inOut" }, 9.9);
    tl.call(() => setStegoAction("idle"), [], 10.6);
    // Mamá despierta, se alegra y lo mira
    tl.call(() => {
      setTriceAction("idle");
      setTriceCel((k) => k + 1);
      sfx("pop");
    }, [], 10.8);
    tl.to(m.rotation, { y: faceY(MAMA_POS, STEGO_TO), duration: 0.9, ease: "back.out(1.6)" }, 11.0);
    // se acercan y juntan sus cabezas: corazones
    tl.to(s.position, { x: STEGO_TO.x + 0.28, duration: 0.7, ease: "sine.inOut" }, 11.8);
    tl.to(m.position, { x: MAMA_POS.x - 0.26, duration: 0.7, ease: "sine.inOut" }, 11.8);
    tl.call(() => {
      setHearts((k) => k + 1);
      setLabels(true);
      sfx("sparkle");
    }, [], 12.3);
    tl.to(s.position, { x: STEGO_TO.x, duration: 0.8, ease: "sine.inOut" }, 13.3);
    tl.to(m.position, { x: MAMA_POS.x, duration: 0.8, ease: "sine.inOut" }, 13.3);
    // juntos miran el huevo de Joaquín… se mueve… ¡nace!
    tl.to(s.rotation, { y: faceY(STEGO_TO, EGG_POS), duration: 0.8, ease: "back.out(1.6)" }, 13.5);
    tl.to(m.rotation, { y: faceY(MAMA_POS, EGG_POS), duration: 0.8, ease: "back.out(1.6)" }, 13.6);
    tl.call(() => {
      setStegoLook("none");
      setTriceLook("none");
      shake.current = 0.05;
    }, [], 14.2);
    tl.call(() => {
      sfx("chime");
      setPhase("title");
      setHatched((h) => ({ ...h, main: true }));
      setTimeout(() => sfx("sparkle"), 300);
    }, [], 14.8);
    tl.call(() => {
      setStegoCel((k) => k + 1);
      setTriceCel((k) => k + 1);
      sfx("rawr");
      shake.current = 0.08;
    }, [], 15.3);
    tl.call(() => {
      setStegoLook("pointer");
      setTriceLook("pointer");
      setPhase("ready");
    }, [], 16.6);
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
        camera.position.lerpVectors(from, new THREE.Vector3(0, 1.55, 2.5), p.k);
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
    triceTimer.current = setTimeout(() => setTriceCel((k) => k + 1), 600);
  };
  const hatch = (id: string) => {
    if (hatched[id]) return;
    sfx("pop");
    setTimeout(() => sfx("sparkle"), 250);
    setHatched((h) => ({ ...h, [id]: true }));
  };

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
      <Triceratops groupRef={mama} flower scale={0.95} action={triceAction} look={triceLook} celebrateKey={triceCel} shadows={shadows} onPoke={pokeTrice} />
      <Hearts burstKey={hearts} at={[0, 1.55, -0.05]} />
      <NameTag visible={labels} target={stego} y={1.55} label="Papá" color="#2BA36B" />
      <NameTag visible={labels} target={mama} y={1.4} label="Mamá" color="#E86A92" />
      <NameTag visible={!!hatched.main} position={[EGG_POS.x, groundHeight(EGG_POS.x, EGG_POS.z) + 0.68, EGG_POS.z]} label="Joaquín" color="#F2A900" />
      <FlyingPtero shadows={shadows} celebrateKey={pteroCel} onPoke={() => {
        sfx("flap");
        setPteroCel((k) => k + 1);
      }} />
      {/* huevo principal, junto al claro */}
      <BabyDino position={[EGG_POS.x, groundHeight(EGG_POS.x, EGG_POS.z), EGG_POS.z]} rotation={[0, 0, 0]} scale={0.62} hatched={!!hatched.main} onHatch={() => hatch("main")} shadows={shadows} />
      {/* nido con huevos rosados (como el colgante) */}
      <Nest position={[-2.6, groundHeight(-2.6, 1.7), 1.7]} />
      <BabyDino position={[-2.73, groundHeight(-2.6, 1.7) + 0.05, 1.65]} rotation={[0, 0.4, 0.05]} scale={0.38}
        eggColor={{ base: "#F4CDBE", a: "#E2A58F", b: "#D98F7A" }} bodyColor="#BFE3F5"
        hatched={!!hatched.a} onHatch={() => hatch("a")} shadows={shadows} />
      <BabyDino position={[-2.4, groundHeight(-2.6, 1.7) + 0.05, 1.85]} rotation={[0, -0.3, -0.06]} scale={0.34}
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

/** Corazones que suben cuando Papá y Mamá juntan sus cabezas. */
function Hearts({ burstKey, at }: { burstKey: number; at: [number, number, number] }) {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.12);
    sh.bezierCurveTo(-0.02, -0.08, -0.16, -0.02, -0.16, 0.06);
    sh.bezierCurveTo(-0.16, 0.14, -0.06, 0.17, 0, 0.09);
    sh.bezierCurveTo(0.06, 0.17, 0.16, 0.14, 0.16, 0.06);
    sh.bezierCurveTo(0.16, -0.02, 0.02, -0.08, 0, -0.12);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 10 });
    g.center();
    return g;
  }, []);
  const mats = useMemo(() => ["#FF6F91", "#FF8FAB", "#FFB3C6", "#E8476F"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.25 })), []);
  const items = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ dx: (Math.sin(i * 2.3) * 0.5), delay: i * 0.12, s: 0.7 + (i % 3) * 0.3, spin: (i % 2 ? 1 : -1) * (1 + i * 0.2) })), []);
  const refs = useRef<THREE.Mesh[]>([]);
  const t0 = useRef<number | null>(null);
  const lastKey = useRef(burstKey);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (burstKey !== lastKey.current) {
      lastKey.current = burstKey;
      t0.current = t;
    }
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = t0.current === null ? -1 : (t - t0.current - it.delay) / 2.6;
      if (k < 0 || k > 1) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const pop = Math.min(1, k * 6);
      m.position.set(at[0] + it.dx * k + Math.sin(k * 9 + i) * 0.08, at[1] + k * 1.6, at[2]);
      m.rotation.y = k * it.spin * 3;
      m.scale.setScalar(it.s * pop * (1 - Math.max(0, k - 0.75) * 4));
    });
  });
  return (
    <group>
      {items.map((_, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el!)} geometry={geo} material={mats[i % mats.length]} visible={false} />
      ))}
    </group>
  );
}

const tagCache = new Map<string, THREE.Texture>();
function tagTexture(label: string, color: string) {
  const key = label + color;
  const hit = tagCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.font = "700 76px Fredoka, 'Baloo 2', system-ui, sans-serif";
  const w = Math.min(500, g.measureText(label).width + 90);
  const x = (512 - w) / 2;
  g.fillStyle = "rgba(255,252,245,0.95)";
  g.strokeStyle = color;
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(x, 18, w, 120, 60);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, 256, 82);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tagCache.set(key, tex);
  return tex;
}

/** Etiqueta flotante con el nombre de cada personaje. */
function NameTag({ visible, label, color, target, y = 1.5, position }: { visible: boolean; label: string; color: string; target?: React.RefObject<THREE.Group>; y?: number; position?: [number, number, number] }) {
  const sp = useRef<THREE.Sprite>(null!);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    // espera a que la fuente esté lista para dibujar el nombre
    let alive = true;
    document.fonts?.ready.then(() => alive && setTex(tagTexture(label, color)));
    return () => {
      alive = false;
    };
  }, [label, color]);
  const k = useRef(0);
  useFrame((state, delta) => {
    k.current = THREE.MathUtils.damp(k.current, visible && tex ? 1 : 0, 7, delta);
    const s = sp.current;
    if (!s) return;
    const bob = Math.sin(state.clock.elapsedTime * 2 + label.length) * 0.03;
    if (target?.current) s.position.set(target.current.position.x, target.current.position.y + y + bob, target.current.position.z);
    else if (position) s.position.set(position[0], position[1] + bob, position[2]);
    const e = k.current;
    s.scale.set(0.95 * e, 0.3 * e, 1);
    (s.material as THREE.SpriteMaterial).opacity = e;
    s.visible = e > 0.01;
  });
  return (
    <sprite ref={sp} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} fog={false} />
    </sprite>
  );
}
