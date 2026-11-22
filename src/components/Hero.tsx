'use client';

import { useEffect, useRef } from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring,
} from 'framer-motion';
import { ArrowDown } from 'lucide-react';

const LINE_1 = ['Designing', 'Trust', 'Into'];
const LINE_2 = ['Digital', 'Commerce'];

// Particle tuning
const PARTICLE_COUNT = 25;
const PARTICLE_RADIUS = 1.5;
const PARTICLE_ALPHA = 0.2;
const REPEL_RADIUS = 120;
const REPEL_PUSH = 28;

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* Lightweight canvas micro-particles (z-0). Drift gently, parallax away from the cursor.
   With prefers-reduced-motion they are drawn once and never animate. */
function ParticleField({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const host = canvas?.closest('section') as HTMLElement | null;
    if (!canvas || !ctx || !host) return;

    type P = { x: number; y: number; vx: number; vy: number; ox: number; oy: number; c: string };
    const colors = ['#F8FAFC', '#A5B4FC', '#6EE7B7'];
    const mouse = { x: -9999, y: -9999 };
    let particles: P[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = PARTICLE_ALPHA;
      for (const p of particles) {
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x + p.ox, p.y + p.oy, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        let tx = 0;
        let ty = 0;
        if (d > 0 && d < REPEL_RADIUS) {
          const f = (1 - d / REPEL_RADIUS) * REPEL_PUSH;
          tx = (dx / d) * f;
          ty = (dy / d) * f;
        }
        p.ox += (tx - p.ox) * 0.08;
        p.oy += (ty - p.oy) * 0.08;
      }
    };

    const loop = () => {
      step();
      draw();
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) {
        particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          ox: 0,
          oy: 0,
          c: colors[i % colors.length],
        }));
      }
      draw();
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (!reduce) {
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export default function Hero() {
  const reduce = !!useReducedMotion();

  // Cursor spotlight (450px radius)
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const sx = useSpring(mx, { stiffness: 180, damping: 28, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 180, damping: 28, mass: 0.6 });
  const spotMask = useMotionTemplate`radial-gradient(450px circle at ${sx}px ${sy}px, #000 0%, transparent 100%)`;
  const spotGlow = useMotionTemplate`radial-gradient(450px circle at ${sx}px ${sy}px, rgba(99,102,241,0.14), rgba(16,185,129,0.07) 55%, transparent 100%)`;
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  // Magnetic CTA
  const bx = useSpring(useMotionValue(0), { stiffness: 200, damping: 16 });
  const by = useSpring(useMotionValue(0), { stiffness: 200, damping: 16 });
  const onBtnMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    bx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    by.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const onBtnLeave = () => { bx.set(0); by.set(0); };

  const drift = (duration: number, x: number[], y: number[]) =>
    reduce
      ? {}
      : { animate: { x, y }, transition: { duration, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const } };

  return (
    <section onPointerMove={onPointerMove} className="relative min-h-screen overflow-hidden bg-[#07080B] text-[#F8FAFC]">
      {/* Ambient background (z-0) */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <motion.div
          {...drift(26, [-80, 90], [-40, 60])}
          className="absolute -left-48 -top-24 h-[36rem] w-[36rem] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, #312E81 0%, transparent 70%)' }}
        />
        <motion.div
          {...drift(32, [70, -90], [50, -50])}
          className="absolute -right-40 top-1/3 h-[34rem] w-[34rem] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, #064E3B 0%, transparent 70%)' }}
        />
        <motion.div
          {...drift(38, [-50, 70], [-60, 40])}
          className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #312E81 0%, transparent 70%)' }}
        />

        {/* Base architectural grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, #000 40%, transparent 80%)',
          }}
        />

        {/* Cursor spotlight: soft tint + illuminated grid lines */}
        {!reduce && (
          <>
            <motion.div className="absolute inset-0" style={{ background: spotGlow }} />
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: 0.22,
                backgroundImage:
                  'linear-gradient(rgba(165,180,252,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,0.6) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                maskImage: spotMask,
                WebkitMaskImage: spotMask,
              }}
            />
          </>
        )}

        {/* Micro-particles */}
        <ParticleField reduce={reduce} />
      </div>

      {/* Navbar (z-30) */}
      <nav className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.3em] sm:text-xs">
            AetherCommerce
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-400 sm:gap-8 sm:text-sm">
          <button onClick={() => scrollToId('storefront-sandbox')} className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
            Storefront Lab
          </button>
          <button onClick={() => scrollToId('ux-principles')} className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
            UX Principles
          </button>
        </div>
      </nav>

      {/* Centerpiece (z-20) */}
      <div className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-slate-300 backdrop-blur-md sm:text-xs"
        >
          Interaction Science Lab · Empirical UX Sandbox
        </motion.div>

        <h1 className="flex max-w-full flex-col items-center font-[family-name:var(--font-jakarta)] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-8xl">
          {[LINE_1, LINE_2].map((line, li) => (
            <span key={li} className="flex flex-wrap justify-center gap-x-3 sm:gap-x-5">
              {line.map((w, i) => (
                <span key={w} className="overflow-hidden pb-[0.12em]">
                  <motion.span
                    initial={{ y: reduce ? 0 : '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, delay: 0.3 + (li * LINE_1.length + i) * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className={`inline-block ${li === 1 ? 'bg-gradient-to-br from-[#F8FAFC] to-[#94A3B8] bg-clip-text text-transparent' : ''}`}
                  >
                    {w}
                  </motion.span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="mt-8 max-w-2xl text-base text-slate-400 sm:text-xl"
        >
          An empirical comparison of deceptive dark patterns versus calm, transparent checkout architecture.
        </motion.p>

        <motion.button
          type="button"
          onClick={() => scrollToId('storefront-sandbox')}
          onMouseMove={onBtnMove}
          onMouseLeave={onBtnLeave}
          style={{ x: bx, y: by }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-12 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          Experience Live Storefront
          <ArrowDown className="h-4 w-4" />
        </motion.button>
      </div>
    </section>
  );
}