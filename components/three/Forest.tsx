"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { TierConfig } from "@/lib/quality";
import { softDot } from "./materials";

// ——— utilidades ———
export function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const POND = { x: 0.6, z: -12.5, r: 3.4 };
export const WATERFALL_Z = -16.2;

/** Altura del terreno: claro plano al centro, colinas suaves alrededor, hondonada del estanque. */
export function groundHeight(x: number, z: number) {
  const d = Math.hypot(x, z * 0.85);
  const ramp = THREE.MathUtils.smoothstep(d, 9, 36);
  const hills = (Math.sin(x * 0.13) + Math.sin(z * 0.11 + 1.3)) * 0.8 + Math.sin((x + z) * 0.07) * 1.4;
  let h = hills * ramp * 1.6 + ramp * ramp * 4 + Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.05;
  const pd = Math.hypot(x - POND.x, z - POND.z);
  h -= Math.max(0, 1 - pd / (POND.r + 1.4)) * 0.5;
  return h;
}

const wind = { value: 0 };

function addWind(material: THREE.Material, strength = 0.07) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind;
    shader.vertexShader =
      "uniform float uTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float bend = clamp(position.z, 0.0, 1.2); bend *= bend;
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        transformed.x += sin(uTime * 1.6 + ip.x * 0.6 + ip.z * 0.4) * ${strength.toFixed(3)} * bend;
        transformed.y += sin(uTime * 2.1 + ip.z * 0.8 + ip.x * 0.3) * ${(strength * 0.5).toFixed(3)} * bend;`,
      );
  };
  material.customProgramCacheKey = () => `wind-${strength}`;
  return material;
}

function vertexGradient(g: THREE.BufferGeometry, axis: "y" | "z", from: string, to: string, min: number, max: number) {
  const pos = g.attributes.position;
  const a = new THREE.Color(from);
  const b = new THREE.Color(to);
  const c = new THREE.Color();
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = THREE.MathUtils.clamp(((axis === "y" ? pos.getY(i) : pos.getZ(i)) - min) / (max - min), 0, 1);
    c.copy(a).lerp(b, v);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Hoja de helecho: contorno con foliolos, curvada en arco (sale hacia +z). */
export function frondGeometry() {
  const s = new THREE.Shape();
  const n = 12;
  const width = (v: number) => 0.17 * Math.sin(Math.PI * Math.min(1, v * 1.08)) * (1 - v * 0.3);
  s.moveTo(0.012, 0);
  for (let i = 1; i <= n; i++) {
    const v = i / n;
    const vm = (i - 0.55) / n;
    s.lineTo(width(vm) + 0.01, vm - 0.035);
    s.lineTo(0.012 + width(v) * 0.18, v - 0.01);
  }
  s.lineTo(0, 1);
  for (let i = n; i >= 1; i--) {
    const v = i / n;
    const vm = (i - 0.55) / n;
    s.lineTo(-0.012 - width(v) * 0.18, v - 0.01);
    s.lineTo(-width(vm) - 0.01, vm - 0.035);
  }
  s.lineTo(-0.012, 0);
  const g = new THREE.ShapeGeometry(s, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const v = pos.getY(i);
    pos.setXYZ(i, x, 0.62 * Math.sin(v * Math.PI * 0.8), v * 0.95);
  }
  g.computeVertexNormals();
  return vertexGradient(g, "z", "#2F6B45", "#8FCB6E", 0, 1);
}

function footprintGeometry() {
  const s = new THREE.Shape();
  s.absellipse(0, -0.02, 0.075, 0.07, 0, Math.PI * 2, false, 0);
  const toes = [-0.62, 0, 0.62].map((a) => {
    const t = new THREE.Shape();
    const cx = Math.sin(a) * 0.15;
    const cy = Math.cos(a) * 0.15;
    t.absellipse(cx, cy, 0.034, 0.12, 0, Math.PI * 2, false, -a);
    return t;
  });
  const g = mergeGeometries([new THREE.ShapeGeometry(s, 10), ...toes.map((t) => new THREE.ShapeGeometry(t, 8))]);
  g.rotateX(-Math.PI / 2);
  return g;
}

function fill(mesh: THREE.InstancedMesh | null, items: Array<{ m: THREE.Matrix4; c?: THREE.Color }>) {
  if (!mesh) return;
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, it.m);
    if (it.c) mesh.setColorAt(i, it.c);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
function mat4(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy = sx, sz = sx) {
  _q.setFromEuler(_e.set(rx, ry, rz, "YXZ"));
  return _m.clone().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Zonas libres: el claro central y el corredor por donde viaja la cámara. */
function blocked(x: number, z: number, margin = 0) {
  if (Math.hypot(x, z) < 4.2 + margin) return true;
  if (z > 2 && z < 30 && x > -2.6 - margin && x < 3.6 + margin + (z - 2) * 0.12) return true;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.8) return true;
  return false;
}

// ——— Suelo ———
function Ground({ shadows }: { shadows: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(170, 170, 150, 150);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const moss = new THREE.Color("#8CC46E");
    const deep = new THREE.Color("#4F8E55");
    const clearing = new THREE.Color("#BFDB8F");
    const sand = new THREE.Color("#E6DCA8");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z));
      const d = Math.hypot(x, z);
      const n = Math.sin(x * 0.45) * Math.cos(z * 0.38) * 0.5 + 0.5;
      c.copy(deep).lerp(moss, n * 0.8 + 0.1);
      c.lerp(clearing, 1 - THREE.MathUtils.smoothstep(d, 2.5, 7.5));
      const pd = Math.hypot(x - POND.x, z - POND.z);
      c.lerp(sand, Math.max(0, 1 - Math.abs(pd - POND.r - 0.4) / 1.1) * 0.8);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

// ——— Árboles ———
function Trees({ count, shadows }: { count: number; shadows: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopies = useRef<THREE.InstancedMesh>(null);
  const palmTrunks = useRef<THREE.InstancedMesh>(null);
  const palmFronds = useRef<THREE.InstancedMesh>(null);

  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.3, 3.2, 9);
    trunk.translate(0, 1.6, 0);
    vertexGradient(trunk, "y", "#6E5238", "#9A7552", 0, 3.2);
    const parts = [
      [0, 3.6, 0, 1.35],
      [0.95, 3.2, 0.3, 1],
      [-0.85, 3.25, -0.2, 1.05],
      [0.2, 4.35, -0.1, 0.95],
      [-0.35, 3.35, 0.85, 0.85],
      [0.45, 3.4, -0.85, 0.85],
    ].map(([x, y, z, r]) => {
      const g = new THREE.SphereGeometry(r, 18, 14);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
        const k = 1 + Math.sin(vx * 4.1 + vz * 3.3) * 0.05 + Math.cos(vy * 5.2) * 0.04;
        p.setXYZ(i, vx * k + x, vy * k + y, vz * k + z);
      }
      return g;
    });
    const canopy = mergeGeometries(parts);
    canopy.computeVertexNormals();
    vertexGradient(canopy, "y", "#B8C9A0", "#FFFFFF", 2.2, 5);

    const palmTrunk = new THREE.CylinderGeometry(0.15, 0.24, 2.4, 8, 8);
    palmTrunk.translate(0, 1.2, 0);
    const pp = palmTrunk.attributes.position;
    const cols = new Float32Array(pp.count * 3);
    const ca = new THREE.Color("#7A5B3E");
    const cb = new THREE.Color("#A88660");
    for (let i = 0; i < pp.count; i++) {
      const band = Math.floor(pp.getY(i) / 0.3) % 2;
      const c = band ? ca : cb;
      cols.set([c.r, c.g, c.b], i * 3);
    }
    palmTrunk.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return { trunk, canopy, palmTrunk, frond: frondGeometry() };
  }, []);

  const mats = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      canopy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      frond: addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), 0.12),
    }),
    [],
  );

  useLayoutEffect(() => {
    const rand = seededRandom(1234);
    const greens = ["#5FA35A", "#4E9A5C", "#77B85E", "#3F8A55", "#8CC36A", "#68AD6E"].map((c) => new THREE.Color(c));
    const t: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    const cnp: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    const pt: Array<{ m: THREE.Matrix4 }> = [];
    const pf: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    let placed = 0;
    let guard = 0;
    // árboles sobre el acantilado de la cascada
    for (const [x, z, s] of [[-3.6, WATERFALL_Z - 2.4, 1.1], [3.4, WATERFALL_Z - 2.2, 1.0], [-6.5, WATERFALL_Z - 1.2, 1.3], [6.8, WATERFALL_Z - 1.0, 1.2]] as const) {
      const y = 6.2 - Math.abs(x) * 0.35;
      t.push({ m: mat4(x, y, z, 0, rand() * 6, 0, s) });
      cnp.push({ m: mat4(x, y, z, 0, rand() * 6, 0, s), c: greens[Math.floor(rand() * greens.length)] });
    }
    while (placed < count && guard++ < 4000) {
      const a = rand() * Math.PI * 2;
      const r = 7 + Math.pow(rand(), 0.8) * 42;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.9 - 4;
      if (blocked(x, z, 1.4)) continue;
      const y = groundHeight(x, z) - 0.05;
      const s = 0.85 + rand() * 0.75;
      if (rand() < 0.62) {
        t.push({ m: mat4(x, y, z, (rand() - 0.5) * 0.08, rand() * 6.28, (rand() - 0.5) * 0.08, s, s * (0.9 + rand() * 0.35), s) });
        cnp.push({ m: mat4(x, y, z, 0, rand() * 6.28, 0, s, s * (0.9 + rand() * 0.3), s), c: greens[Math.floor(rand() * greens.length)] });
      } else {
        const h = 0.8 + rand() * 0.8;
        pt.push({ m: mat4(x, y, z, (rand() - 0.5) * 0.15, 0, (rand() - 0.5) * 0.15, s, s * h, s) });
        const fronds = 9;
        const tint = new THREE.Color().setHSL(0.3 + rand() * 0.06, 0.45, 0.55 + rand() * 0.1);
        for (let k = 0; k < fronds; k++) {
          pf.push({
            m: mat4(x, y + 2.35 * s * h, z, -0.25 - rand() * 0.25, (k / fronds) * Math.PI * 2 + rand() * 0.3, 0, s * 2.1),
            c: tint,
          });
        }
      }
      placed++;
    }
    fill(trunks.current, t);
    fill(canopies.current, cnp);
    fill(palmTrunks.current, pt);
    fill(palmFronds.current, pf);
  }, [count]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[geos.trunk, mats.trunk, count]} castShadow={shadows} receiveShadow={shadows} />
      <instancedMesh ref={canopies} args={[geos.canopy, mats.canopy, count]} castShadow={shadows} />
      <instancedMesh ref={palmTrunks} args={[geos.palmTrunk, mats.trunk, count]} castShadow={shadows} />
      <instancedMesh ref={palmFronds} args={[geos.frond, mats.frond, count * 9]} castShadow={shadows} />
    </group>
  );
}

// ——— Helechos ———
export const HERO_FERNS: Array<[number, number, number]> = [
  // [x, z, escala] — los grandes por donde pasa la cámara y donde se esconde el estegosaurio
  [-3.4, -1.6, 1.9],
  [-4.6, -0.4, 1.6],
  [-2.4, -2.9, 1.5],
  [-2.2, 8.6, 2.1],
  [-3.6, 10.2, 2.3],
  [3.9, 9.4, 2.0],
  [2.9, 2.6, 1.3],
  [4.6, -1.9, 1.2],
  [-1.2, -4.6, 1.4],
  [1.6, -4.2, 1.3],
];

function Ferns({ count, shadows }: { count: number; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => frondGeometry(), []);
  const mat = useMemo(() => addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide })), []);
  const fronds = 9;
  useLayoutEffect(() => {
    const rand = seededRandom(98);
    const items: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    const spots: Array<[number, number, number]> = [...HERO_FERNS];
    let guard = 0;
    while (spots.length < count && guard++ < 5000) {
      const a = rand() * Math.PI * 2;
      const r = 4.6 + Math.pow(rand(), 1.3) * 26;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 2;
      if (blocked(x, z, 0.2)) continue;
      spots.push([x, z, 0.7 + rand() * 0.8]);
    }
    for (const [x, z, s] of spots) {
      const y = groundHeight(x, z) - 0.03;
      const tint = new THREE.Color().setHSL(0.27 + rand() * 0.08, 0.35 + rand() * 0.2, 0.7 + rand() * 0.2);
      const base = rand() * 6.28;
      for (let k = 0; k < fronds; k++) {
        items.push({
          m: mat4(x, y, z, -0.15 - rand() * 0.35, base + (k / fronds) * Math.PI * 2 + (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.2, s * (0.75 + rand() * 0.35)),
          c: tint,
        });
      }
    }
    fill(ref.current, items);
  }, [count]);
  return <instancedMesh ref={ref} args={[geo, mat, (count + HERO_FERNS.length) * fronds]} castShadow={shadows} receiveShadow={false} />;
}

// ——— Rocas ———
export const PERCH = { x: -4.4, z: -3.4, s: 1.1 };

function Rocks({ count, shadows }: { count: number; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1, 5);
    ico.deleteAttribute("normal");
    ico.deleteAttribute("uv");
    const g = mergeVertices(ico);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const stone = new THREE.Color("#B7B9A6");
    const moss = new THREE.Color("#7DB563");
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + Math.sin(x * 2.3 + z * 1.7) * 0.1 + Math.cos(y * 3.1 + x * 1.3) * 0.07 + Math.sin(z * 5.1 + y * 2.2) * 0.025;
      p.setXYZ(i, x * k, y * k * 0.72, z * k);
      c.copy(stone).lerp(moss, THREE.MathUtils.smoothstep(y + Math.sin(x * 6 + z * 4) * 0.08, 0.1, 0.55));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: false }), []);
  useLayoutEffect(() => {
    const rand = seededRandom(555);
    const items: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    // roca donde se posa el pterodáctilo + roca junto al triceratops
    items.push({ m: mat4(PERCH.x, groundHeight(PERCH.x, PERCH.z) + 0.2, PERCH.z, 0, 0.4, 0, PERCH.s * 1.1, PERCH.s, PERCH.s * 0.9) });
    items.push({ m: mat4(4.6, groundHeight(4.6, -2.4), -2.4, 0, 1.2, 0, 1.25, 1.05, 1.0) });
    // acantilado de la cascada
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 2.2 + (rand() - 0.5);
      const z = WATERFALL_Z - 1.6 - rand() * 1.6;
      if (Math.abs(x) < 1.8) continue;
      items.push({ m: mat4(x, groundHeight(x, z) + 1.5, z, rand(), rand() * 6, rand(), 2.4 + rand() * 1.5, 3.6 + rand() * 2.8, 2.2) });
    }
    items.push({ m: mat4(0, 9.4, WATERFALL_Z - 2.6, 0.2, 0.3, 0, 3.8, 2.4, 2.4) });
    items.push({ m: mat4(-2.4, 6.5, WATERFALL_Z - 1.6, 0.5, 1, 0, 2.2, 3.4, 2) });
    items.push({ m: mat4(2.4, 6.3, WATERFALL_Z - 1.6, 0.1, 2, 0, 2.2, 3.4, 2) });
    let guard = 0;
    while (items.length < count + 14 && guard++ < 3000) {
      const a = rand() * Math.PI * 2;
      const r = 4.4 + rand() * 24;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 2;
      if (blocked(x, z, 0.3)) continue;
      const s = 0.25 + Math.pow(rand(), 2) * 0.9;
      items.push({ m: mat4(x, groundHeight(x, z) + s * 0.15, z, rand(), rand() * 6.28, rand(), s, s, s) });
    }
    fill(ref.current, items);
  }, [count]);
  return <instancedMesh ref={ref} args={[geo, mat, count + 16]} castShadow={shadows} receiveShadow={shadows} />;
}

// ——— Flores ———
function Flowers({ count }: { count: number }) {
  const stems = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const centers = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const stem = new THREE.CylinderGeometry(0.009, 0.012, 0.3, 5);
    stem.translate(0, 0.15, 0);
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      const g = new THREE.SphereGeometry(0.05, 10, 8);
      g.scale(1, 0.3, 0.62);
      g.translate(0.055, 0, 0);
      g.rotateY(a);
      return g;
    });
    const head = mergeGeometries(petals);
    head.translate(0, 0.3, 0);
    const center = new THREE.SphereGeometry(0.03, 10, 8);
    center.translate(0, 0.31, 0);
    return { stem, head, center };
  }, []);
  const mats = useMemo(
    () => ({
      stem: new THREE.MeshStandardMaterial({ color: "#4E8F4A", roughness: 0.8 }),
      head: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
      center: new THREE.MeshStandardMaterial({ color: "#FFC93C", roughness: 0.5 }),
    }),
    [],
  );
  useLayoutEffect(() => {
    const rand = seededRandom(77);
    const palette = ["#FF8A7A", "#FFC93C", "#FFB7CF", "#FFFCF5", "#8FD3F4", "#FFB38A", "#E86A9A"].map((c) => new THREE.Color(c));
    const st: Array<{ m: THREE.Matrix4 }> = [];
    const hd: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    let guard = 0;
    while (st.length < count && guard++ < 6000) {
      // en grupitos
      const a = rand() * Math.PI * 2;
      const r = 2.6 + Math.pow(rand(), 1.4) * 20;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r - 1;
      const color = palette[Math.floor(rand() * palette.length)];
      const n = 3 + Math.floor(rand() * 6);
      for (let k = 0; k < n && st.length < count; k++) {
        const x = cx + (rand() - 0.5) * 1.2;
        const z = cz + (rand() - 0.5) * 1.2;
        if (Math.hypot(x, z) < 2.2) continue;
        if (z > 3 && z < 30 && x > -1.4 && x < 2.4) continue;
        const y = groundHeight(x, z);
        const s = 0.8 + rand() * 0.9;
        const m = mat4(x, y, z, (rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.3, s);
        st.push({ m });
        hd.push({ m, c: color });
      }
    }
    fill(stems.current, st);
    fill(heads.current, hd);
    fill(centers.current, st);
  }, [count]);
  return (
    <group>
      <instancedMesh ref={stems} args={[geo.stem, mats.stem, count]} />
      <instancedMesh ref={heads} args={[geo.head, mats.head, count]} />
      <instancedMesh ref={centers} args={[geo.center, mats.center, count]} />
    </group>
  );
}

// ——— Huellas prehistóricas ———
function Footprints() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => footprintGeometry(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#6E8C4A", transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [],
  );
  const steps = useMemo(() => {
    // rastro desde los helechos hasta el claro y hacia la cámara
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.2, 0, -2.6),
      new THREE.Vector3(-2.2, 0, -0.9),
      new THREE.Vector3(-0.4, 0, 0.6),
      new THREE.Vector3(0.6, 0, 2.6),
      new THREE.Vector3(0.4, 0, 5.4),
    ]);
    const out: Array<{ m: THREE.Matrix4 }> = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const p = path.getPointAt(u);
      const tan = path.getTangentAt(u);
      const side = i % 2 ? 1 : -1;
      const yaw = Math.atan2(tan.x, tan.z);
      const x = p.x + Math.cos(yaw) * 0.14 * side;
      const z = p.z - Math.sin(yaw) * 0.14 * side;
      out.push({ m: mat4(x, groundHeight(x, z) + 0.015, z, 0, yaw, 0, 0.85) });
    }
    return out;
  }, []);
  useLayoutEffect(() => fill(ref.current, steps), [steps]);
  return <instancedMesh ref={ref} args={[geo, mat, steps.length]} renderOrder={1} />;
}

// ——— Mariposas ———
function Butterflies({ count }: { count: number }) {
  const groups = useRef<THREE.Group[]>([]);
  const wings = useRef<THREE.Mesh[]>([]);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.05, 0.12, 0.2, 0.14, 0.18, 0.03);
    s.bezierCurveTo(0.2, -0.04, 0.12, -0.1, 0.05, -0.12);
    s.bezierCurveTo(0.02, -0.08, 0.01, -0.03, 0, 0);
    const g = new THREE.ShapeGeometry(s, 10);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const colors = ["#FFC93C", "#FF8A7A", "#8FD3F4", "#FFB7CF", "#FFFCF5", "#1FB5B0", "#FFB38A"];
  const mats = useMemo(() => colors.map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.5, emissive: c, emissiveIntensity: 0.15 })), []); // eslint-disable-line react-hooks/exhaustive-deps
  const params = useMemo(() => {
    const rand = seededRandom(31);
    return Array.from({ length: count }, () => ({
      cx: (rand() - 0.5) * 10,
      cz: (rand() - 0.5) * 8 + 1,
      rx: 1.5 + rand() * 2.5,
      rz: 1.2 + rand() * 2,
      y: 0.8 + rand() * 1.4,
      sp: 0.25 + rand() * 0.3,
      ph: rand() * 10,
    }));
  }, [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    params.forEach((p, i) => {
      const g = groups.current[i];
      if (!g) return;
      const a = t * p.sp + p.ph;
      const x = p.cx + Math.sin(a) * p.rx;
      const z = p.cz + Math.sin(a * 2) * p.rz * 0.5;
      const y = p.y + Math.sin(a * 3.1) * 0.25;
      const nx = p.cx + Math.sin(a + 0.05) * p.rx;
      const nz = p.cz + Math.sin((a + 0.05) * 2) * p.rz * 0.5;
      g.position.set(x, y, z);
      g.rotation.y = Math.atan2(nx - x, nz - z);
      const flap = Math.sin(t * 18 + p.ph) * 1.1;
      const l = wings.current[i * 2];
      const r = wings.current[i * 2 + 1];
      if (l) l.rotation.z = flap;
      if (r) r.rotation.z = -flap;
    });
  });
  return (
    <group>
      {params.map((_, i) => (
        <group key={i} ref={(el) => void (groups.current[i] = el!)} scale={0.9}>
          <mesh ref={(el) => void (wings.current[i * 2] = el!)} geometry={geo} material={mats[i % mats.length]} rotation={[0, -Math.PI / 2, 0]} />
          <group scale={[-1, 1, 1]}>
            <mesh ref={(el) => void (wings.current[i * 2 + 1] = el!)} geometry={geo} material={mats[i % mats.length]} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

// ——— Luciérnagas / polen luminoso ———
export function Fireflies({ count, area = [28, 5, 22], center = [0, 0, -1], color = "#FFF1A8", size = 0.09 }: { count: number; area?: [number, number, number]; center?: [number, number, number]; color?: string; size?: number }) {
  const { size: viewport, camera } = useThree();
  const geo = useMemo(() => {
    const rand = seededRandom(9);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (rand() - 0.5) * area[0];
      pos[i * 3 + 1] = center[1] + 0.3 + rand() * area[1];
      pos[i * 3 + 2] = center[2] + (rand() - 0.5) * area[2];
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count, area, center]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uScale: { value: 800 }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } },
        vertexShader: `
          uniform float uTime; uniform float uScale; uniform float uSize;
          attribute float aSeed; varying float vAlpha;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.5 + aSeed * 6.0) * 0.5;
            p.y += sin(uTime * 0.7 + aSeed * 10.0) * 0.35;
            p.z += cos(uTime * 0.4 + aSeed * 4.0) * 0.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * (0.6 + aSeed) * uScale / -mv.z;
            vAlpha = 0.45 + 0.55 * sin(uTime * 1.8 + aSeed * 30.0);
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, a * a * vAlpha);
          }`,
      }),
    [color, size],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
    mat.uniforms.uScale.value = (viewport.height * state.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  });
  return <points geometry={geo} material={mat} />;
}

// ——— Cascada y estanque ———
function Waterfall() {
  const fallMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime; varying vec2 vUv;
          float hash(float n){ return fract(sin(n)*43758.5453); }
          void main(){
            float col = floor(vUv.x * 46.0);
            float speed = 0.9 + hash(col) * 0.8;
            float streak = fract(vUv.y * (2.0 + hash(col+3.0)*2.0) + uTime * speed + hash(col)*10.0);
            float s = smoothstep(0.0, 0.35, streak) * (1.0 - smoothstep(0.55, 1.0, streak));
            vec3 base = mix(vec3(0.55,0.86,0.9), vec3(0.98,1.0,1.0), s * 0.85);
            float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
            float foam = smoothstep(0.12, 0.0, vUv.y);
            float top = smoothstep(1.0, 0.9, vUv.y);
            gl_FragColor = vec4(mix(base, vec3(1.0), foam), (0.7 + s*0.3) * edge * top);
          }`,
      }),
    [],
  );
  const poolMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime; varying vec2 vUv;
          void main(){
            vec2 c = vUv - 0.5; float d = length(c) * 2.0;
            vec2 src = vUv - vec2(0.5, 0.92);
            float rip = sin(length(src) * 48.0 - uTime * 3.0) * 0.5 + 0.5;
            vec3 deep = vec3(0.12, 0.6, 0.62); vec3 shallow = vec3(0.55, 0.88, 0.85);
            vec3 col = mix(deep, shallow, smoothstep(0.2, 1.0, d));
            col += rip * 0.08 * (1.0 - d);
            float edge = smoothstep(1.0, 0.92, d);
            gl_FragColor = vec4(col, 0.92 * edge);
          }`,
      }),
    [],
  );
  const mist = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), color: "#ffffff", transparent: true, opacity: 0.35, depthWrite: false }), []);
  const mistRefs = useRef<THREE.Sprite[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    fallMat.uniforms.uTime.value = t;
    poolMat.uniforms.uTime.value = t;
    mistRefs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.25 + i / 6) % 1;
      m.position.set((i - 2.5) * 0.5, poolY + p * 1.4, WATERFALL_Z + 0.9);
      m.scale.setScalar(1 + p * 1.6);
      m.material.opacity = 0.32 * Math.sin(p * Math.PI);
    });
  });
  const poolY = groundHeight(POND.x, POND.z) + 0.05;
  return (
    <group>
      <mesh position={[0, 4.2, WATERFALL_Z]} material={fallMat}>
        <planeGeometry args={[2.6, 8.6, 1, 1]} />
      </mesh>
      <mesh position={[POND.x, poolY, POND.z]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}>
        <circleGeometry args={[POND.r + 0.6, 48]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <sprite key={i} ref={(el) => void (mistRefs.current[i] = el!)} material={mist.clone()} />
      ))}
    </group>
  );
}

// ——— Rayos de luz entre los árboles ———
function LightShafts() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, "rgba(255,250,220,0)");
    v.addColorStop(0.35, "rgba(255,248,215,0.9)");
    v.addColorStop(1, "rgba(255,248,215,0)");
    g.fillStyle = v;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h;
    g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  const refs = useRef<THREE.Mesh[]>([]);
  const shafts = useMemo(
    () => [
      { x: -5, z: -4, w: 2.4, o: 0.16 },
      { x: -1.6, z: -6, w: 1.6, o: 0.12 },
      { x: 2.6, z: -3, w: 2.8, o: 0.1 },
      { x: -7.5, z: 1, w: 1.8, o: 0.12 },
    ],
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.y = Math.atan2(state.camera.position.x - m.position.x, state.camera.position.z - m.position.z);
      (m.material as THREE.MeshBasicMaterial).opacity = shafts[i].o * (0.75 + 0.25 * Math.sin(t * 0.5 + i * 1.7));
    });
  });
  return (
    <group>
      {shafts.map((s, i) => (
        <group key={i} position={[s.x, 6, s.z]} rotation={[0, 0, 0.42]}>
          <mesh ref={(el) => void (refs.current[i] = el!)}>
            <planeGeometry args={[s.w, 16]} />
            <meshBasicMaterial map={tex} transparent opacity={s.o} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ——— Cielo, montañas y nubes ———
function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color("#7EC8EE") },
          uHorizon: { value: new THREE.Color("#FFF0D2") },
          uSunDir: { value: new THREE.Vector3(-0.5, 0.45, -0.75).normalize() },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, h));
            float sun = pow(max(dot(normalize(vDir), uSunDir), 0.0), 18.0);
            col += vec3(1.0, 0.92, 0.7) * sun * 0.55;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[120, 32, 16]} />
    </mesh>
  );
}

function Mountains() {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const items = useMemo(() => {
    const rand = seededRandom(4242);
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + rand() * 0.25;
      const r = 62 + rand() * 22;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 9 + rand() * 14, w: 12 + rand() * 12, c: ["#7FB89A", "#8CC1A0", "#6FA88F", "#93C7A8"][i % 4] };
    });
  }, []);
  return (
    <group>
      {items.map((m, i) => (
        <mesh key={i} geometry={geo} position={[m.x, -1.5, m.z]} scale={[m.w, m.h, m.w * 0.8]}>
          <meshStandardMaterial color={m.c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ——— Pasto y arbustos ———
function Grass({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const blades = Array.from({ length: 6 }, (_, i) => {
      const g = new THREE.PlaneGeometry(0.03, 0.22, 1, 3);
      g.translate(0, 0.11, 0);
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k);
        pos.setX(k, pos.getX(k) * (1 - y / 0.24));
        pos.setZ(k, (y / 0.22) ** 2 * 0.06);
      }
      g.rotateY((i / 6) * Math.PI * 2);
      g.rotateX(((i % 3) - 1) * 0.15);
      g.translate(Math.cos(i * 2.1) * 0.04, 0, Math.sin(i * 2.1) * 0.04);
      return g;
    });
    const g = mergeGeometries(blades);
    // la altura (y) hace de "z" para el viento: la copiamos a z con un atributo distinto
    return vertexGradient(g, "y", "#4F8E4A", "#B9E08A", 0, 0.22);
  }, []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = wind;
      shader.vertexShader =
        "uniform float uTime;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float bend = position.y * position.y * 12.0;
          vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
          transformed.x += sin(uTime * 2.0 + ip.x * 0.8 + ip.z * 0.6) * 0.12 * bend;
          transformed.z += cos(uTime * 1.7 + ip.z * 0.7) * 0.06 * bend;`,
        );
    };
    m.customProgramCacheKey = () => "grass";
    return m;
  }, []);
  useLayoutEffect(() => {
    const rand = seededRandom(303);
    const items: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    let guard = 0;
    while (items.length < count && guard++ < count * 6) {
      const a = rand() * Math.PI * 2;
      const r = 1.6 + Math.pow(rand(), 1.6) * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r) continue;
      const s = 0.6 + rand() * 0.6;
      const tint = new THREE.Color().setHSL(0.25 + rand() * 0.07, 0.4, 0.75 + rand() * 0.25);
      items.push({ m: mat4(x, groundHeight(x, z) - 0.02, z, 0, rand() * 6.28, 0, s, s * (0.8 + rand() * 0.8), s), c: tint });
    }
    fill(ref.current, items);
  }, [count]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} />;
}

function Bushes({ count, shadows }: { count: number; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const parts = [
      [0, 0.35, 0, 0.5],
      [0.45, 0.25, 0.1, 0.38],
      [-0.42, 0.24, -0.05, 0.4],
      [0.05, 0.28, 0.4, 0.34],
    ].map(([x, y, z, r]) => new THREE.SphereGeometry(r, 16, 12).translate(x, y, z));
    const g = mergeGeometries(parts);
    return vertexGradient(g, "y", "#A9C08F", "#FFFFFF", 0, 0.8);
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  useLayoutEffect(() => {
    const rand = seededRandom(808);
    const greens = ["#5FA35A", "#77B85E", "#4E9A5C", "#8CC36A"].map((c) => new THREE.Color(c));
    const items: Array<{ m: THREE.Matrix4; c?: THREE.Color }> = [];
    let guard = 0;
    while (items.length < count && guard++ < 4000) {
      const a = rand() * Math.PI * 2;
      const r = 5 + Math.pow(rand(), 0.9) * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 3;
      if (blocked(x, z, 0.5)) continue;
      const s = 0.8 + rand() * 1.3;
      items.push({ m: mat4(x, groundHeight(x, z) - 0.1, z, 0, rand() * 6.28, 0, s, s * (0.7 + rand() * 0.4), s), c: greens[Math.floor(rand() * greens.length)] });
    }
    fill(ref.current, items);
  }, [count]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} castShadow={shadows} />;
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const parts = [
      [0, 0, 0, 2.4],
      [2.2, -0.3, 0.2, 1.8],
      [-2.1, -0.4, 0, 1.7],
      [0.9, 0.9, -0.3, 1.6],
      [-0.9, 0.7, 0.4, 1.5],
    ].map(([x, y, z, r]) => new THREE.SphereGeometry(r, 16, 12).translate(x, y, z));
    const g = mergeGeometries(parts);
    g.scale(1, 0.62, 0.8);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#FFF6E6", emissiveIntensity: 0.55, fog: false }), []);
  const clouds = useMemo(
    () => [
      [-26, 30, -60, 2.2],
      [18, 34, -70, 2.8],
      [42, 28, -40, 2],
      [-48, 32, -30, 2.4],
      [4, 38, -85, 3.2],
    ],
    [],
  );
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.004;
  });
  return (
    <group ref={ref}>
      {clouds.map(([x, y, z, s], i) => (
        <mesh key={i} geometry={geo} material={mat} position={[x, y, z]} scale={s} />
      ))}
    </group>
  );
}

/** Bosque prehistórico completo (sin personajes). */
export function Forest({ tier }: { tier: TierConfig }) {
  const shadows = tier.shadows > 0;
  useFrame((state) => {
    wind.value = state.clock.elapsedTime;
  });
  return (
    <group>
      <SkyDome />
      <Clouds />
      <Mountains />
      <Ground shadows={shadows} />
      <Footprints />
      <Trees count={tier.trees} shadows={shadows} />
      <Ferns count={tier.ferns} shadows={shadows} />
      <Rocks count={tier.rocks} shadows={shadows} />
      <Bushes count={tier.bushes} shadows={shadows} />
      <Grass count={tier.grass} />
      <Flowers count={tier.flowers} />
      <Waterfall />
      <LightShafts />
      <Butterflies count={tier.butterflies} />
      <Fireflies count={tier.particles} />
    </group>
  );
}
