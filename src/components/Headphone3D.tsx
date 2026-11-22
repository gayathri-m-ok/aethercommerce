'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, ContactShadows, Environment, Html, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import { Box3, Color, MathUtils, Matrix4, Quaternion, Raycaster, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { MotionValue } from 'framer-motion';
import { FINISH, type FinishKey } from '@/data/finishes';

const MODEL_URL = '/models/sony-headphones.glb';
// If your model faces the wrong way, change this (radians): [x, y, z]
const MODEL_ROTATION: [number, number, number] = [0, 0, 0];
// Largest dimension of the model in scene units (auto-fit)
const MODEL_SIZE = 2.6;
// Materials whose name matches this keep their original look (logos, LEDs, glass)
const KEEP_ORIGINAL = /logo|led|light|glass|lens|screen|indicator|emissive/i;

/* ---------- Materials ---------- */
const TITANIUM = { color: '#1E293B', metalness: 0.85, roughness: 0.25 };
const OBSIDIAN = { color: '#090D16', metalness: 0.7, roughness: 0.3 };
const FOAM = { color: '#111827', metalness: 0, roughness: 0.85 };

/* ---------- Scroll-driven camera angles: front 3/4, side profile, rear/top ---------- */
const ANGLES = [
  { ry: -0.55, rx: 0.08 },
  { ry: -Math.PI / 2, rx: 0 },
  { ry: -2.95, rx: 0.55 },
];
const KEYS = [1 / 6, 1 / 2, 5 / 6];
const smooth = (t: number) => t * t * (3 - 2 * t);

function angleAt(p: number) {
  if (p <= KEYS[0]) return ANGLES[0];
  if (p >= KEYS[2]) return ANGLES[2];
  const i = p < KEYS[1] ? 0 : 1;
  const t = smooth((p - KEYS[i]) / (KEYS[i + 1] - KEYS[i]));
  return {
    ry: ANGLES[i].ry + (ANGLES[i + 1].ry - ANGLES[i].ry) * t,
    rx: ANGLES[i].rx + (ANGLES[i + 1].rx - ANGLES[i].rx) * t,
  };
}

/* Scroll-linked rotation when `progress` is given, otherwise a gentle auto-spin (compact preview) */
function spin(g: Group, progress: MotionValue<number> | undefined, delta: number, reduce: boolean) {
  if (progress) {
    const { ry, rx } = angleAt(progress.get());
    g.rotation.y = MathUtils.damp(g.rotation.y, ry, 3.5, delta);
    g.rotation.x = MathUtils.damp(g.rotation.x, rx, 3.5, delta);
  } else {
    if (!reduce) g.rotation.y += delta * 0.5;
    g.rotation.x = MathUtils.damp(g.rotation.x, 0.08, 3.5, delta);
  }
}

/* ---------- One earcup (s = +1 right, -1 left) ---------- */
function Cup({ s, accent }: { s: 1 | -1; accent: string }) {
  return (
    <group position={[s * 1.2, -0.35, 0]}>
      {/* Matte obsidian anodized aluminum shell */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 0.34, 64]} />
        <meshStandardMaterial {...OBSIDIAN} />
      </mesh>
      {/* Brushed titanium outer cap */}
      <mesh position={[s * 0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.02, 64]} />
        <meshStandardMaterial {...TITANIUM} />
      </mesh>
      {/* Glowing acoustic ring */}
      <mesh position={[s * 0.195, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.38, 0.018, 16, 96]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[s * 0.2, 0, 0]}>
        <sphereGeometry args={[0.03, 24, 24]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.4} />
      </mesh>
      {/* Plush memory-foam cushion */}
      <mesh position={[-s * 0.27, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.45, 0.14, 32, 64]} />
        <meshStandardMaterial {...FOAM} />
      </mesh>
      <mesh position={[-s * 0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 48]} />
        <meshStandardMaterial {...FOAM} />
      </mesh>
      {/* Yoke joint */}
      <RoundedBox args={[0.14, 0.2, 0.22]} radius={0.05} smoothness={4} position={[0, 0.7, 0]}>
        <meshStandardMaterial {...TITANIUM} />
      </RoundedBox>
      {/* Right cup: tactile dial. Left cup: dual microphone ports */}
      {s === 1 ? (
        <mesh position={[0, 0, -0.63]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.07, 40]} />
          <meshStandardMaterial {...TITANIUM} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 0, -0.62]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#000000" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#000000" roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ---------- Full headphone ---------- */
function Headphone({ progress, dark, reduce }: { progress?: MotionValue<number>; dark: boolean; reduce: boolean }) {
  const group = useRef<Group>(null);
  const accent = dark ? '#EF4444' : '#6366F1';

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    spin(g, progress, delta, reduce);
    g.position.y = reduce ? 0 : Math.sin(state.clock.elapsedTime * 1.1) * 0.06;
  });

  return (
    <group ref={group} scale={0.95}>
      {/* Brushed titanium headband */}
      <mesh position={[0, 0.28, 0]} scale={[1, 1, 2.2]}>
        <torusGeometry args={[1.2, 0.07, 24, 128, Math.PI]} />
        <meshStandardMaterial {...TITANIUM} />
      </mesh>
      {/* Headband padding */}
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2 - 0.65]} scale={[1, 1, 2.2]}>
        <torusGeometry args={[1.15, 0.065, 24, 64, 1.3]} />
        <meshStandardMaterial {...FOAM} />
      </mesh>
      <Cup s={1} accent={accent} />
      <Cup s={-1} accent={accent} />
    </group>
  );
}

/* ---------- Hardware callouts: markers + long outward leader lines ----------
   `at`       = rough spot as a fraction of the model's half-size [x, y, z] from its center
   `approach` = direction a ray travels toward the model; it snaps the marker onto the REAL surface of the GLB
   `len`      = leader line length in px (100-140). Flip the sign of `at[0]` if left/right are swapped on your model. */
type HwKind = 'button' | 'rocker' | 'usbc' | 'mic';
type Hardware = { id: string; label: string; kind: HwKind; at: [number, number, number]; approach: [number, number, number]; len: number };
type Snap = { pos: [number, number, number]; normal: [number, number, number] };

const HARDWARE: Hardware[] = [
  { id: 'volume', label: 'Volume Up / Down', kind: 'rocker', at: [-0.72, -0.32, 0.12], approach: [0, 0, 1], len: 130 },
  { id: 'power', label: 'Power Button', kind: 'button', at: [-0.72, -0.50, 0.12], approach: [0, 0, 1], len: 120 },
  { id: 'cushion', label: 'Ear Cushion', kind: 'mic', at: [0.42, -0.38, 0.05], approach: [0, 0, -1], len: 100 },
    { id: 'usbc', label: 'USB-C Charging Port', kind: 'usbc', at: [-0.55, -0.45, -0.18], approach: [-0.99, 0, 0], len: 115 },
];
const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const v4 = new Vector3();
const v5 = new Vector3();
const v6 = new Vector3();
const Z_AXIS = new Vector3(0, 0, 1);

/* Cast a ray at each rough spot and keep the exact surface point + outward normal (in the rotating group's space) */
function computeSnaps(g: Group, model: Object3D, half: [number, number, number]): Record<string, Snap> {
  const out: Record<string, Snap> = {};
  const ray = new Raycaster();
  g.updateWorldMatrix(true, false);
  model.updateWorldMatrix(true, true);
  const inv = new Matrix4().copy(g.matrixWorld).invert();
  for (const h of HARDWARE) {
    const guess = new Vector3(h.at[0] * half[0], h.at[1] * half[1], h.at[2] * half[2]);
    const dir = new Vector3(...h.approach).normalize();
    const origin = g.localToWorld(guess.clone().sub(dir.clone().multiplyScalar(4)));
    ray.set(origin, dir.clone().transformDirection(g.matrixWorld));
    const hit = ray.intersectObject(model, true)[0];
    if (hit) {
      const pos = g.worldToLocal(hit.point.clone());
      const nWorld = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate().transformDirection(g.matrixWorld);
      const n = nWorld.transformDirection(inv);
      if (n.dot(dir) > 0) n.negate(); // always point outward
      out[h.id] = { pos: pos.toArray(), normal: n.toArray() };
    } else {
      out[h.id] = { pos: guess.toArray(), normal: dir.clone().negate().toArray() };
    }
  }
  return out;
}

/* Subtle physical markers: button, volume rocker, USB-C recess, mic pinholes */
/* Subtle physical markers: button, volume rocker, USB-C recess, mic pinholes */
function HardwareMarker({ kind, snap, light }: { kind: HwKind; snap: Snap; light: boolean }) {
  const quat = useMemo(() => new Quaternion().setFromUnitVectors(Z_AXIS, new Vector3(...snap.normal).normalize()), [snap]);
  const pos = useMemo<[number, number, number]>(() => {
    const n = new Vector3(...snap.normal).normalize();
    return [snap.pos[0] + n.x * 0.004, snap.pos[1] + n.y * 0.004, snap.pos[2] + n.z * 0.004];
  }, [snap]);
  const cap = light
    ? { color: '#2B303B', metalness: 0.5, roughness: 0.35 }
    : { color: '#E2E8F0', metalness: 0.25, roughness: 0.35 };
  return (
    <group position={pos} quaternion={quat}>
      {kind === 'button' && (
        <RoundedBox args={[0.1, 0.05, 0.03]} radius={0.012} smoothness={4}>
          <meshStandardMaterial {...cap} />
        </RoundedBox>
      )}
      {kind === 'rocker' && (
        <>
          <RoundedBox args={[0.05, 0.12, 0.03]} radius={0.012} smoothness={4}>
            <meshStandardMaterial {...cap} />
          </RoundedBox>
          <mesh position={[0, 0, 0.0155]}>
            <planeGeometry args={[0.03, 0.006]} />
            <meshBasicMaterial color={light ? '#0B0D12' : '#94A3B8'} />
          </mesh>
        </>
      )}
      {kind === 'usbc' && (
        <>
          <RoundedBox args={[0.13, 0.058, 0.012]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={light ? '#2B303B' : '#CBD5E1'} metalness={0.6} roughness={0.4} />
          </RoundedBox>
          <RoundedBox args={[0.1, 0.034, 0.016]} radius={0.015} smoothness={4} position={[0, 0, 0.002]}>
            <meshStandardMaterial color="#000000" roughness={1} />
          </RoundedBox>
        </>
      )}
      {kind === 'mic' && (
        <>
          {[-0.035, 0.035].map((x) => (
            <mesh key={x} position={[x, 0, 0.002]}>
              <circleGeometry args={[0.014, 20]} />
              <meshBasicMaterial color="#05060A" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}


/* Leader line + label. Contrast adapts: obsidian ink on the light studio, white ink on the dark studio. */
function HardwareLabel({ hw, snap, progress, light }: { hw: Hardware; snap: Snap; progress: MotionValue<number>; light: boolean }) {
  const holder = useRef<Group>(null);
  const node = useRef<HTMLDivElement>(null);
  const ink = light ? '#090D16' : '#F8FAFC';
  const normal = useMemo(() => new Vector3(...snap.normal).normalize(), [snap]);
  const pos = useMemo<[number, number, number]>(() => [snap.pos[0] + normal.x * 0.01, snap.pos[1] + normal.y * 0.01, snap.pos[2] + normal.z * 0.01], [snap, normal]);

  useFrame(({ camera }) => {
    const h = holder.current;
    const el = node.current;
    if (!h || !el || !h.parent) return;
    const phase = Math.min(2, Math.max(0, Math.floor(progress.get() * 3)));
    h.getWorldPosition(v1);
    h.parent.getWorldPosition(v4);
    v2.copy(normal).transformDirection(h.matrixWorld);
    const facing = v2.dot(v3.copy(camera.position).sub(v1).normalize());
    el.style.opacity = phase === 2 && facing > 0.2 ? '1' : '0';
    // The leader line always runs OUTWARD, away from the headset's center on screen
    const dx = v5.copy(v1).sub(v4).dot(v6.setFromMatrixColumn(camera.matrixWorld, 0));
    el.dataset.side = dx < 0 ? 'left' : 'right';
  });

  return (
    <group ref={holder} position={pos}>
      <Html pointerEvents="none" zIndexRange={[20, 0]}>
        <div
          ref={node}
          data-side="right"
          style={{ opacity: 0, color: ink }}
          className="hidden -translate-y-1/2 items-center transition-opacity duration-500 data-[side=left]:-translate-x-full data-[side=left]:flex-row-reverse lg:flex"
        >
          <span
            className="-mx-1 block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: ink, boxShadow: `0 0 0 3px ${light ? 'rgba(9,13,22,0.2)' : 'rgba(248,250,252,0.3)'}` }}
          />
          <span className="block h-px shrink-0" style={{ width: hw.len, backgroundColor: ink }} />
          <span
            className={`whitespace-nowrap rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] backdrop-blur-md ${
              light ? 'border-[#090D16]/15 bg-white/70' : 'border-white/15 bg-[#0B0D12]/70'
            }`}
          >
            {hw.label}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ---------- Real GLB model: auto-centered, auto-scaled, live finish switching ---------- */
function SonyModel({ progress, finish, reduce, light }: { progress?: MotionValue<number>; finish: FinishKey; reduce: boolean; light: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<Group>(null);
  const snapped = useRef(false);
  const frames = useRef(0);
  const [snaps, setSnaps] = useState<Record<string, Snap>>({});
  const target = useRef({ color: new Color(FINISH.black.color), metalness: FINISH.black.metalness, roughness: FINISH.black.roughness });

  const { model, mats, scale, bottom, half } = useMemo(() => {
    const model = scene.clone(true);
    const mats: MeshStandardMaterial[] = [];
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = list.map((m) => {
        const c = m.clone();
        const std = c as MeshStandardMaterial;
        if (std.isMeshStandardMaterial && !KEEP_ORIGINAL.test(c.name) && std.emissive.getHex() === 0) {
          std.map = null; // flat studio finish instead of baked colors
          std.color.set(FINISH.black.color);
          std.metalness = FINISH.black.metalness;
          std.roughness = FINISH.black.roughness;
          std.needsUpdate = true;
          mats.push(std);
        }
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    const scale = MODEL_SIZE / Math.max(size.x, size.y, size.z, 0.0001);
    return {
      model, mats, scale, bottom: -(size.y * scale) / 2,
      half: [(size.x * scale) / 2, (size.y * scale) / 2, (size.z * scale) / 2] as [number, number, number],
    };
  }, [scene]);

  useEffect(() => {
    const f = FINISH[finish];
    target.current.color.set(f.color);
    target.current.metalness = f.metalness;
    target.current.roughness = f.roughness;
  }, [finish]);

  useFrame((state, delta) => {
    const g = group.current;
    if (g) {
      spin(g, progress, delta, reduce);
      g.position.y = reduce ? 0 : Math.sin(state.clock.elapsedTime * 1.1) * 0.06;
    }
    // Once the model is placed, snap the hardware markers onto its real surface (stage only)
    if (g && progress && !snapped.current && ++frames.current > 5) {
      snapped.current = true;
      setSnaps(computeSnaps(g, model, half));
    }
    // Smooth finish transition
    const k = 1 - Math.exp(-7 * delta);
    const t = target.current;
    for (const m of mats) {
      m.color.lerp(t.color, k);
      m.metalness += (t.metalness - m.metalness) * k;
      m.roughness += (t.roughness - m.roughness) * k;
    }
  });

  return (
    <>
      <group ref={group}>
        <Center>
          <group rotation={MODEL_ROTATION} scale={scale}>
            <primitive object={model} />
          </group>
        </Center>
        {progress && HARDWARE.map((h) => snaps[h.id] && (
          <group key={h.id}>
            <HardwareMarker kind={h.kind} snap={snaps[h.id]} light={light} />
            <HardwareLabel hw={h} snap={snaps[h.id]} progress={progress} light={light} />
          </group>
        ))}
      </group>
      <ContactShadows position={[0, bottom - 0.2, 0]} opacity={0.55} scale={8} blur={2.8} far={2.6} />
    </>
  );
}

/* ---------- Helpers ---------- */
class Boundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('Headphone3D: falling back after a load error.', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// Keep vertical swipes scrolling the page on touch screens; horizontal drags rotate the model.
function TouchFix() {
  const gl = useThree((s) => s.gl);
  useEffect(() => { gl.domElement.style.touchAction = 'pan-y'; }, [gl]);
  return null;
}

function FinishSwitcher({ finish, onChange, compact, light }: { finish: FinishKey; onChange: (k: FinishKey) => void; compact?: boolean; light?: boolean }) {
  return (
    <div className={compact ? 'z-10 flex flex-col items-center gap-2 pt-4' : 'absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2'}>
      <div
        className={`flex items-center gap-3 rounded-full border px-3 py-2 backdrop-blur-2xl transition-colors duration-700 ${light ? 'border-slate-900/10 bg-slate-900/5' : 'border-white/10 bg-white/5'}`}
        role="group"
        aria-label="Studio finish"
      >
        {(Object.keys(FINISH) as FinishKey[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-label={FINISH[k].name}
            aria-pressed={finish === k}
            onClick={() => onChange(k)}
            style={{ backgroundColor: FINISH[k].swatch }}
            className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
              finish === k
                ? light ? 'border-slate-900 ring-2 ring-slate-900/30 ring-offset-2 ring-offset-white' : 'border-white ring-2 ring-white/40 ring-offset-2 ring-offset-[#07080B]'
                : light ? 'border-slate-900/20' : 'border-white/20'
            }`}
          />
        ))}
      </div>
      <p className={`font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em] transition-colors duration-700 ${light ? 'text-slate-600' : 'text-slate-400'}`}>{FINISH[finish].name}</p>
    </div>
  );
}

/* ---------- Scene ---------- */
export default function Headphone3D({
  progress, dark, reduce, finish, onFinishChange, compact = false, light = false,
}: {
  progress?: MotionValue<number>;
  dark: boolean;
  reduce: boolean;
  finish: FinishKey;
  onFinishChange: (k: FinishKey) => void;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className={compact ? 'flex h-full w-full flex-col' : 'relative h-full w-full'}>
      <div className={compact ? 'relative min-h-0 flex-1' : 'h-full w-full'}>
        <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.3, compact ? 4.9 : 5.4], fov: 34 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ background: 'transparent' }}
      >
        {/* Studio lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 4, 5]} intensity={1.0} />
        <directionalLight position={[-3, 2, -4]} intensity={1.4} color={dark ? '#FCA5A5' : '#A5B4FC'} />
        <Suspense fallback={null}>
          <Boundary fallback={null}>
            <Environment preset="studio" />
          </Boundary>
        </Suspense>

        <Suspense fallback={null}>
          <Boundary
            fallback={
              <>
                <Headphone progress={progress} dark={dark} reduce={reduce} />
                <ContactShadows position={[0, -1.4, 0]} opacity={0.55} scale={8} blur={2.8} far={2.6} />
              </>
            }
          >
            <SonyModel progress={progress} finish={finish} reduce={reduce} light={light} />
          </Boundary>
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 1.7}
        />
        <TouchFix />
      </Canvas>
      </div>
      <FinishSwitcher finish={finish} onChange={onFinishChange} compact={compact} light={light} />
    </div>
  );
}

useGLTF.preload(MODEL_URL);