'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Check, Clock, Headphones, Lock } from 'lucide-react';

const CARD_CLASS = 'flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl';
const DEMO_CLASS = 'relative mb-8 h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07080B]/80 text-left';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ---------- Card 1: noise to calm ---------- */
function NoiseToCalm({ reduce }: { reduce: boolean }) {
  const [calm, setCalm] = useState(false);
  const [secs, setSecs] = useState(119);

  useEffect(() => {
    if (reduce) { setCalm(true); return; }
    const t = setInterval(() => setCalm((c) => !c), 3400);
    return () => clearInterval(t);
  }, [reduce]);

  useEffect(() => {
    if (calm || reduce) return;
    setSecs(119);
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [calm, reduce]);

  return (
    <button type="button" onClick={() => setCalm((c) => !c)} aria-label="Toggle between noisy and calm checkout" className={`${DEMO_CLASS} cursor-pointer`}>
      <span className="absolute right-3 top-3 font-[family-name:var(--font-mono)] text-[9px] tracking-[0.18em] text-slate-500">
        {calm ? 'MODE B · CALM' : 'MODE A · NOISE'}
      </span>
      <div className="flex h-full flex-col items-center justify-center gap-3 px-5">
        <div className="flex items-center gap-2 text-slate-300">
          <Headphones className="h-4 w-4" />
          <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em]">AETHER ONE</span>
        </div>
        <div className="flex h-14 w-full items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {calm ? (
              <motion.div
                key="calm"
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300"
              >
                <motion.span
                  animate={reduce ? undefined : { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-2 w-2 rounded-full bg-emerald-400"
                />
                In Stock · Ready to Ship
              </motion.div>
            ) : (
              <motion.div
                key="noise"
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <motion.div
                  animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {mmss(secs)} · Only 2 left!
                </motion.div>
                <motion.span
                  animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-[10px] font-bold text-yellow-300"
                >
                  19 people viewing
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}

/* ---------- Card 2: red traps fade out, clean white defaults fade in, cursor clicks the primary button ---------- */
const TRAPS = ['Handling fee · +$18', 'Platform service fee · +$13', 'Extended warranty · +$25 (pre-checked)'];

function TargetChoice({ reduce }: { reduce: boolean }) {
  const loop = { duration: 8, repeat: Infinity, ease: 'easeInOut' as const };
  const clickTimes = [0, 0.22, 0.6, 0.65, 0.71, 0.9, 1];

  // Phase 1 (red) fades out, Phase 2 (white) fades in; reduced motion shows the final ethical state
  const redAnim = reduce ? { opacity: 0 } : { opacity: [1, 1, 0, 0, 1] };
  const redTrans = reduce ? { duration: 0 } : { ...loop, times: [0, 0.28, 0.44, 0.92, 1] };
  const whiteAnim = reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] };
  const whiteTrans = reduce ? { duration: 0 } : { ...loop, times: [0, 0.38, 0.52, 0.9, 1] };

  return (
    <div className={DEMO_CLASS} aria-hidden>
      {/* Phase 1: Traditional traps in red */}
      <motion.span
        className="absolute right-3 top-2.5 font-[family-name:var(--font-mono)] text-[8px] tracking-[0.18em] text-red-300/70"
        initial={{ opacity: reduce ? 0 : 1 }} animate={redAnim} transition={redTrans}
      >
        TRADITIONAL TRAPS
      </motion.span>
      <motion.div className="absolute inset-x-0 top-2" initial={{ opacity: reduce ? 0 : 1 }} animate={redAnim} transition={redTrans}>
        <div className="ml-4 space-y-1">
          {TRAPS.map((r) => (
            <div key={r} className="flex items-center gap-2 whitespace-nowrap text-[10px] leading-4 text-red-300">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-red-400/70 bg-red-500/15">
                <Check className="h-2.5 w-2.5 text-red-300" />
              </span>
              {r}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Phase 2: Ethical transparent defaults in clean white */}
      <motion.span
        className="absolute right-3 top-2.5 font-[family-name:var(--font-mono)] text-[8px] tracking-[0.18em] text-slate-100/80"
        initial={{ opacity: reduce ? 1 : 0 }} animate={whiteAnim} transition={whiteTrans}
      >
        ETHICAL DEFAULTS
      </motion.span>
      <motion.div className="absolute inset-x-0 bottom-16" initial={{ opacity: reduce ? 1 : 0 }} animate={whiteAnim} transition={whiteTrans}>
        <div className="ml-4 space-y-1">
          <div className="flex items-center gap-2 whitespace-nowrap text-[10px] leading-4 text-white">
            <span className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-white" />
            2-Year Accidental Care · +$24 (Unchecked)
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap text-[10px] leading-4 text-slate-100">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            $0 Handling fee · $0 Platform fee
          </div>
        </div>
      </motion.div>

      {/* Large primary target */}
      <div className="absolute inset-x-5 bottom-3.5">
        <motion.div
          className="relative flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
          animate={reduce ? undefined : { scale: [1, 1, 1, 0.97, 1, 1, 1] }}
          transition={{ ...loop, times: clickTimes }}
        >
          Buy AETHER ONE · $207
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-5 -mt-5 h-10 w-10 rounded-full border border-emerald-400"
            initial={{ opacity: 0 }}
            animate={reduce ? { opacity: 0 } : { scale: [0.5, 0.5, 0.5, 2.5, 2.5], opacity: [0, 0, 0.8, 0, 0] }}
            transition={reduce ? { duration: 0 } : { ...loop, times: [0, 0.63, 0.69, 0.85, 1] }}
          />
        </motion.div>
      </div>

      {/* Gliding cursor */}
      <motion.div
        className="pointer-events-none absolute z-10"
        style={reduce ? { left: '50%', top: 124 } : undefined}
        animate={reduce ? undefined : { left: ['18%', '72%', '50%', '50%', '18%'], top: [34, 44, 124, 124, 34] }}
        transition={{ ...loop, times: [0, 0.22, 0.6, 0.9, 1] }}
      >
        <motion.span
          className="-ml-1.5 -mt-1.5 block h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_12px_3px_rgba(110,231,183,0.6)]"
          animate={reduce ? undefined : { scale: [1, 1, 1, 0.6, 1, 1, 1] }}
          transition={{ ...loop, times: clickTimes }}
        />
      </motion.div>
    </div>
  );
}

/* ---------- Card 3: price lock ---------- */
function PriceLock({ reduce }: { reduce: boolean }) {
  const count = useMotionValue(reduce ? 263 : 207);
  const label = useTransform(count, (v) => `$${Math.round(v)}`);
  const feeOpacity = useTransform(count, [207, 263], [0, 1]);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(count, [207, 207, 263, 263], { duration: 5.5, times: [0, 0.2, 0.6, 1], ease: 'easeInOut', repeat: Infinity });
    return () => controls.stop();
  }, [reduce, count]);

  return (
    <div className={`${DEMO_CLASS} grid grid-cols-2 divide-x divide-white/10`} aria-hidden>
      <div className="flex flex-col items-center justify-center gap-1 px-3">
        <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.18em] text-red-300/80">TRADITIONAL</span>
        <span className="text-xs text-slate-500 line-through">$207</span>
        <motion.span className="text-2xl font-bold text-red-400">{label}</motion.span>
        <motion.span style={{ opacity: feeOpacity }} className="text-[11px] font-semibold text-red-300">(+$56 fees)</motion.span>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 px-3">
        <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.18em] text-emerald-300/80">ETHICAL</span>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/50 bg-emerald-400/10 px-3 py-2.5 text-center shadow-[0_0_24px_rgba(52,211,153,0.25)]">
          <div className="flex items-center justify-center gap-1.5 text-emerald-300">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-sm font-bold">$207 → $207</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/80">Final</p>
          {!reduce && (
            <motion.span
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ['-120%', '260%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Section ---------- */
export default function UXPrinciples() {
  const reduce = !!useReducedMotion();

  const cards = [
    {
      title: "Sweller's Cognitive Load Theory",
      body: 'Fake countdown timers and low-stock alarms consume limited working memory with extraneous stress. Replacing artificial urgency with a calm, static availability status lets users evaluate the product without mental fatigue.',
      demo: <NoiseToCalm reduce={reduce} />,
    },
    {
      title: "Fitts's & Hick's Laws",
      body: "Eliminating pre-checked add-ons reduces competing decisions at checkout (Hick’s Law), while a single high-contrast primary action target minimizes pointer travel and misclicks (Fitts’s Law).",
      demo: <TargetChoice reduce={reduce} />,
    },
    {
      title: 'Anti-Drip-Pricing Transparency',
      body: 'The $207 you see is the $207 you pay. Surprising buyers with hidden handling or platform fees at the final step triggers loss aversion and cart abandonment. Locking the $207 all-inclusive price from product view to payment preserves calibrated trust.',
      demo: <PriceLock reduce={reduce} />,
    },
  ];

  return (
    <section id="ux-principles" className="relative bg-[#07080B] px-5 py-24 text-[#F8FAFC] sm:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto max-w-2xl text-center font-[family-name:var(--font-jakarta)] text-3xl font-semibold tracking-tight sm:text-5xl">
          How the interface protects human attention
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {cards.map((c) => (
            <article key={c.title} className={CARD_CLASS}>
              {c.demo}
              <h3 className="mb-3 text-xl font-semibold tracking-tight">{c.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}