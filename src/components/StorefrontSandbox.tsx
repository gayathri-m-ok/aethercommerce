'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Clock, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { SURVEY, UXMode } from '@/data/mockData';
import { FINISH, type FinishKey } from '@/data/finishes';
import { logSession, sheetEnabled, type Sequence } from '@/lib/sheet';

const Headphone3D = dynamic(() => import('./Headphone3D'), { ssr: false, loading: () => <div className="h-full w-full" /> });

export interface SessionRecord { mode: UXMode; seconds: number; answers: number[]; total: number; accidentalAddon: boolean }
type Step = 'closed' | 'checkout' | 'survey' | 'debrief';

const PRODUCT = {
  brand: 'AETHER ONE',
  name: 'Reference Acoustic Headphones',
  model: 'AE-01',
  finish: 'Matte Obsidian & Brushed Titanium',
  price: 207,
  listPrice: 370,
  handling: 18,
  platform: 13,
  warranty: 25,
  accidental: 24,
  countdown: 14 * 60 + 59,
  fakeStock: 2,
  fakeViewers: 19,
};

const formatUSD = (n: number) => '$' + n.toLocaleString('en-US');

const MARQUEE_ITEMS = ['COGNITIVE LOAD REDUCTION', 'TRANSPARENT PRICING', "FITTS'S LAW", 'ZERO DARK PATTERNS', "HICK'S LAW"];
// One logged response per device per mode (keeps repeat clicks out of the study data)
const LOG_KEY = (m: UXMode) => 'aether_logged_' + m;
const hasLogged = (m: UXMode) => {
  try { return localStorage.getItem(LOG_KEY(m)) === 'true'; } catch { return false; }
};

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ---------- Kinetic marquee divider ---------- */
function MarqueeDivider() {
  const reduce = useReducedMotion();
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/10 py-6" aria-hidden>
      <motion.div
        className="flex w-max whitespace-nowrap font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] text-slate-500 sm:text-sm"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((m, i) => (
          <span key={i} className="flex items-center">
            <span>{m}</span>
            <span className="mx-8 text-slate-700">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- Sticky 3D showcase: scroll rotates the headset through 3 feature angles ---------- */
const FEATURES = [
  {
    view: 'FRONT 3/4 VIEW',
    title: '40mm Custom Carbon-Composite Drivers',
    body: 'Ultra-lightweight diaphragms respond instantaneously across sub-bass and vocal frequencies, preserving studio clarity at any listening volume.',
  },
  {
    view: 'SIDE PROFILE',
    title: 'Zero-Pressure Memory Foam & Tactile Controls',
    body: "Plush oval ear cushions distribute clamping force evenly for all-day wear, paired with dedicated physical Power and Volume Up/Down keys on the outer rim",
  },
  {
    view: 'REAR / TOP VIEW',
    title: 'Dual-Mic Adaptive ANC & Fast USB-C Power',
    body: 'Precision beamforming microphones isolate ambient noise in real time, backed by a recessed USB-C fast-charging port for effortless multi-day playback',
  },
];

const TITLE_CLASS =
  'col-start-1 row-start-1 whitespace-nowrap bg-gradient-to-b bg-clip-text font-[family-name:var(--font-jakarta)] text-5xl font-extrabold tracking-tight text-transparent transition-opacity duration-700 sm:text-7xl lg:text-9xl';

function ShowcaseStage({ dark, finish, onFinishChange }: { dark: boolean; finish: FinishKey; onFinishChange: (k: FinishKey) => void }) {
  const reduce = !!useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [feature, setFeature] = useState(0);
  const light = finish === 'black'; // black headset on a white studio, white headset on obsidian
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  const textY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -50, reduce ? 0 : 50]);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setFeature(Math.min(2, Math.max(0, Math.floor(v * 3)))));
  const f = FEATURES[feature];

  return (
    <div ref={trackRef} className="relative h-[300vh]">
      {/* Backgrounds crossfade with the finish */}
      <div className="pointer-events-none absolute inset-0 bg-[#07080B]" aria-hidden />
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FFFFFF_0%,#E8ECF1_100%)] transition-opacity duration-700 ${light ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#07080B] to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07080B] to-transparent" aria-hidden />

      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Model region */}
        <div className="absolute inset-x-0 top-0 bottom-56 lg:bottom-0 lg:right-[24rem]">
          <div className="absolute inset-x-0 top-0 bottom-20 sm:bottom-14">
          {/* Oversized translucent type behind the product (z-10) */}
          <motion.div aria-hidden style={{ y: textY }} className="pointer-events-none absolute inset-0 z-10 grid select-none place-items-center">
            <h2 className={`${TITLE_CLASS} from-white/35 to-white/0 ${light ? 'opacity-0' : 'opacity-100'}`}>AETHER ONE</h2>
            <h2 className={`${TITLE_CLASS} from-slate-900/25 to-slate-900/0 ${light ? 'opacity-100' : 'opacity-0'}`}>AETHER ONE</h2>
          </motion.div>
          {/* Transparent 3D canvas (z-20) */}
          <div className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing">
            <Headphone3D progress={scrollYProgress} dark={dark} reduce={reduce} finish={finish} onFinishChange={onFinishChange} light={light} />
          </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-1 px-4 pb-3 text-center">
            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">
              <span className="hidden md:inline">DRAG TO ROTATE · </span>SCROLL TO EXPLORE
            </p>
            <p className={`max-w-xl text-[11px] leading-snug transition-colors duration-700 sm:text-xs ${light ? 'text-slate-600' : 'text-slate-400'}`}>
              Establishing realistic product attachment and purchase intent before introducing checkout friction.
            </p>
          </div>

        </div>

        {/* Feature callout (z-30) */}
        <div className="absolute inset-x-5 bottom-4 z-30 lg:inset-x-auto lg:bottom-auto lg:right-10 lg:top-1/2 lg:w-80 lg:-translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -16 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl border p-6 backdrop-blur-2xl ${light ? 'border-slate-900/10 bg-white/70 text-slate-900' : 'border-white/10 bg-white/[0.05] text-white'}`}
            >
              <p className={`mb-3 font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] ${light ? 'text-slate-500' : 'text-slate-400'}`}>{f.view}</p>
              <h3 className="mb-2 text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className={`text-sm leading-relaxed ${light ? 'text-slate-600' : 'text-slate-400'}`}>{f.body}</p>
              <div className="mt-5 flex gap-1.5">
                {FEATURES.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i === feature ? (light ? 'bg-emerald-600' : 'bg-emerald-400') : light ? 'bg-slate-900/10' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- Ethical-mode trust elements ---------- */
const SPECS = ['40h Battery', 'Adaptive ANC', '2-Yr Warranty'];
const REVIEW_BARS: [number, number][] = [[5, 92], [4, 6], [3, 1], [2, 1], [1, 0]];

function UxPin({ id, text, pin, setPin }: { id: string; text: string; pin: string | null; setPin: (id: string | null) => void }) {
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label="UX law hotspot"
        onMouseEnter={() => setPin(id)} onMouseLeave={() => setPin(null)}
        onFocus={() => setPin(id)} onBlur={() => setPin(null)}
        onClick={() => setPin(pin === id ? null : id)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/70 backdrop-blur-xl hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
      >
        <Plus className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {pin === id && (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute right-0 top-7 z-30 w-60 rounded-xl border border-white/10 bg-[#0d0f14]/95 p-3 text-xs leading-relaxed text-white/80 backdrop-blur-2xl"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </span>
  );
}

function EthicalDetails({ arrival, accidental, setAccidental, pin, setPin }: {
  arrival: string; accidental: boolean; setAccidental: (v: boolean) => void; pin: string | null; setPin: (id: string | null) => void;
}) {
  const [showReviews, setShowReviews] = useState(false);
  return (
    <div className="space-y-4">
      {/* Verified social proof */}
      <div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-300">
            <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
            <span className="font-semibold text-white">4.9</span>
            <span>·</span>
            <span>1,420 verified buyers</span>
            <button
              type="button" onClick={() => setShowReviews((v) => !v)} aria-expanded={showReviews}
              className="text-xs text-slate-400 underline underline-offset-4 hover:text-white"
            >
              (Full unedited review breakdown)
            </button>
          </div>
          <UxPin id="proof" pin={pin} setPin={setPin} text="Verified, unedited reviews build trust without pressure: social proof instead of scarcity." />
        </div>
        <AnimatePresence initial={false}>
          {showReviews && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {REVIEW_BARS.map(([stars, share]) => (
                  <div key={stars} className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="w-6">{stars}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-8 text-right">{share}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chunked spec pills (Miller's Law) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {SPECS.map((sp) => (
            <span key={sp} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-xl">{sp}</span>
          ))}
        </div>
        <UxPin id="specs" pin={pin} setPin={setPin} text="Three chunks fit working memory (Miller's Law), so specs scan in one glance." />
      </div>

      {/* Transparent fulfillment */}
      <div className="flex items-start justify-between gap-2">
        <ul className="space-y-2">
          <li className="flex items-center gap-2.5 text-sm text-slate-200"><Check className="h-4 w-4 shrink-0 text-emerald-400" />Free insured delivery · Arrives {arrival}</li>
          <li className="flex items-center gap-2.5 text-sm text-slate-200"><Check className="h-4 w-4 shrink-0 text-emerald-400" />30-day free returns · $0 hidden fees</li>
        </ul>
        <UxPin id="fulfil" pin={pin} setPin={setPin} text="Costs and dates stated up front remove checkout surprises and lower extraneous load." />
      </div>

      {/* Optional add-on, unchecked by default */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
          <span>Add 2-Year Accidental Care · +{formatUSD(PRODUCT.accidental)}</span>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">Optional</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" role="switch" aria-checked={accidental} aria-label="Add 2-Year Accidental Care" onClick={() => setAccidental(!accidental)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${accidental ? 'bg-emerald-500' : 'bg-white/15'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${accidental ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <UxPin id="addon" pin={pin} setPin={setPin} text="Opt-in and off by default: full autonomy and one less decision (Hick's Law)." />
        </div>
      </div>
    </div>
  );
}

/* ---------- Section ---------- */
export default function StorefrontSandbox({ sessions, onComplete }: { sessions: SessionRecord[]; onComplete: (r: SessionRecord) => void }) {
  const [mode, setMode] = useState<UXMode>('dark');
  const [step, setStep] = useState<Step>('closed');
  const [remaining, setRemaining] = useState(PRODUCT.countdown);
  const [warranty, setWarranty] = useState(true);
  const [newsletter, setNewsletter] = useState(true);
  const [finish, setFinish] = useState<FinishKey>('black');
  const [accidental, setAccidental] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [replay, setReplay] = useState(false);
  const [isControlledStudy, setIsControlledStudy] = useState(false);
  const [sequence, setSequence] = useState<Sequence>('AB');
  const [consent, setConsent] = useState(false);
  const [completed, setCompleted] = useState<UXMode[]>([]);
  const [arrival, setArrival] = useState('Nov 24');
  const reduce = !!useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<number[]>(SURVEY.map(() => -1));
  const startedAt = useRef(0);
  const last = useRef<SessionRecord | null>(null);
  const dark = mode === 'dark';

  useEffect(() => {
    if (!dark) return;
    const t = setInterval(() => setRemaining((r) => (r <= 1 ? PRODUCT.countdown : r - 1)), 1000);
    return () => clearInterval(t);
  }, [dark]);

  useEffect(() => { setWarranty(dark); setNewsletter(dark); setAccidental(false); setPin(null); }, [dark]);

  // Controlled study (?study=1): read after mount so server and client markup always match.
  // Counterbalancing (AB / BA) is assigned only here, so public visitors keep the Traditional-first demo.
  useEffect(() => {
    const study = new URLSearchParams(window.location.search).get('study') === '1';
    setIsControlledStudy(study);
    if (!study) return;
    let seq: Sequence = Math.random() < 0.5 ? 'AB' : 'BA';
    try {
      const saved = sessionStorage.getItem('aether_sequence');
      if (saved === 'AB' || saved === 'BA') seq = saved;
      sessionStorage.setItem('aether_sequence', seq);
      setConsent(sessionStorage.getItem('aether_consent') === 'true');
    } catch { /* sessionStorage unavailable: fall back to this page load's random order */ }
    setSequence(seq);
    setMode(seq === 'AB' ? 'dark' : 'ethical');
  }, []);

  // Delivery estimate: 3 days from today
  useEffect(() => {
    setArrival(new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }, []);

  useEffect(() => {
    if (step !== 'checkout' || !dark) return;
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 1600);
    return () => clearTimeout(t);
  }, [step, dark]);

  const total = dark ? PRODUCT.price + PRODUCT.handling + PRODUCT.platform + (warranty ? PRODUCT.warranty : 0) : PRODUCT.price + (accidental ? PRODUCT.accidental : 0);

  const openCheckout = () => { startedAt.current = Date.now(); setAnswers(SURVEY.map(() => -1)); setStep('checkout'); };
  const acceptConsent = () => {
    setConsent(true);
    try { sessionStorage.setItem('aether_consent', 'true'); } catch { /* ignore */ }
  };
  const consentOk = !isControlledStudy || consent;
  const lastMode: UXMode = last.current?.mode ?? mode;
  const otherMode: UXMode = lastMode === 'dark' ? 'ethical' : 'dark';
  const showContinue = !completed.includes(otherMode);
  const continueToOther = () => { setMode(otherMode); setStep('closed'); };

  const submitSurvey = () => {
    // Mode A: did the pre-checked warranty stay checked at purchase?
    const accidentalAddon = dark && warranty;
    const rec: SessionRecord = { mode, seconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)), answers, total, accidentalAddon };
    const alreadyLogged = hasLogged(mode);
    last.current = rec; onComplete(rec);
    setReplay(isControlledStudy && alreadyLogged);
    setCompleted((c) => (c.includes(mode) ? c : [...c, mode]));
    setStep('debrief');
    // Only controlled-study sessions (?study=1) are sent, and only once per device per mode
    if (isControlledStudy && sheetEnabled && !alreadyLogged) {
      logSession({ mode, durationSec: rec.seconds, ease: answers[0], trust: answers[1], pressure: answers[2], sequence, accidentalAddon });
      try { localStorage.setItem(LOG_KEY(mode), 'true'); } catch { /* storage unavailable: never blocks the UI */ }
    }
  };
  const avg = (m: UXMode, f: (r: SessionRecord) => number) => {
    const rs = sessions.filter((r) => r.mode === m);
    return rs.length ? (rs.reduce((s, r) => s + f(r), 0) / rs.length).toFixed(1) : '-';
  };

  return (
    <section id="storefront-sandbox" className="relative bg-[#07080B] text-white">
      <MarqueeDivider />
      <ShowcaseStage dark={dark} finish={finish} onFinishChange={setFinish} />

      <div className="px-3 pb-28 pt-16 sm:px-5 sm:pb-32">
        {/* Apple-style segmented switcher */}
        <div className="mx-auto mb-8 flex w-fit max-w-full rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-2xl sm:mb-10" role="tablist" aria-label="UX mode">
          {([['dark', 'Traditional UI'], ['ethical', 'Ethical UI']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className="relative rounded-full px-4 py-2 text-xs font-semibold sm:px-7 sm:py-2.5 sm:text-sm">
              {mode === k && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-white/15" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className={`relative ${mode === k ? 'text-white' : 'text-white/50'}`}>{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}
            className={`mx-auto mt-6 grid w-full max-w-4xl gap-6 overflow-hidden rounded-3xl border p-4 backdrop-blur-2xl sm:mt-10 sm:gap-8 sm:p-10 md:grid-cols-2 ${dark ? 'border-red-500/30 bg-red-950/20' : 'border-white/10 bg-white/[0.04]'}`}
          >
            <div className="flex min-w-0 flex-col justify-center gap-3">
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] text-slate-400">{PRODUCT.brand} · MODEL {PRODUCT.model}</p>
              <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">{PRODUCT.name}</h3>
              <p className="text-slate-400">Finish: {FINISH[finish].name}</p>
              <div className={`relative mt-3 h-72 w-full overflow-hidden rounded-2xl transition-colors duration-500 sm:h-[26rem] md:cursor-grab md:active:cursor-grabbing ${

                 finish === 'white'
                  ? 'border border-white/10 bg-[#07080B]'
                  : 'bg-[radial-gradient(circle_at_center,#F8FAFC_0%,#CBD5E1_100%)]'
               }`}
            >
                <Headphone3D dark={dark} reduce={reduce} finish={finish} onFinishChange={setFinish} compact />
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4">
              {isControlledStudy && !consent && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                  <p className="text-xs leading-relaxed text-slate-300">
                    This simulated e-commerce study records anonymous task completion time, checkout selections, and post-task usability ratings for academic HCI research. No real payment is processed, and you may stop at any time.
                  </p>
                  <button
                    type="button"
                    onClick={acceptConsent}
                    className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    I Agree &amp; Begin Study
                  </button>
                </div>
              )}
              {dark ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold">
                    <Clock className="h-4 w-4" /> Flash deal ends in <span className="font-[family-name:var(--font-mono)]">{mmss(remaining)}</span>
                  </div>
                  <p className="text-sm font-bold text-yellow-300">Only {PRODUCT.fakeStock} left in stock — {PRODUCT.fakeViewers} people viewing</p>
                </>
              ) : (
                <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> Price &amp; Review Integrity Verified
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xl text-slate-500 line-through">{formatUSD(PRODUCT.listPrice)}</span>
                <span className="text-3xl font-bold">{formatUSD(PRODUCT.price)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${dark ? 'bg-yellow-400/15 text-yellow-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                  -{Math.round((1 - PRODUCT.price / PRODUCT.listPrice) * 100)}%
                </span>
              </div>

              {dark ? (
                <div className="space-y-2 text-sm text-white/80">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} className="h-4 w-4 accent-red-500" />
                    Extended warranty <span className="text-white/40">(+{formatUSD(PRODUCT.warranty)})</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="h-4 w-4 accent-red-500" />
                    Partner offers &amp; newsletter
                  </label>
                </div>
              ) : (
                <EthicalDetails arrival={arrival} accidental={accidental} setAccidental={setAccidental} pin={pin} setPin={setPin} />
              )}

              <div className="relative">
              <motion.button
                whileTap={{ scale: 0.97 }} onClick={openCheckout} disabled={!consentOk}
                className={`${dark ? 'rounded-lg bg-red-600 px-6 py-4 text-base font-extrabold hover:bg-red-500' : 'rounded-full bg-white px-8 py-4 text-base font-semibold text-black hover:bg-white/90'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {dark ? 'BUY NOW before it is gone!' : `Buy now · ${formatUSD(total)}`}
              </motion.button>
                {!dark && (
                  <span className="absolute -top-2 right-3">
                    <UxPin id="cta" pin={pin} setPin={setPin} text="One large primary action: faster to find and hit (Fitts's Law)." />
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Checkout, micro-survey and debriefing */}
      <AnimatePresence>
        {step !== 'closed' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0f14]/95 p-6 backdrop-blur-2xl"
            >
              {step === 'checkout' && (
                <>
                  <button aria-label="Close" onClick={() => setStep('closed')} className="absolute right-4 top-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
                  <h3 className="mb-5 text-xl font-bold">Checkout</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-white/70">{PRODUCT.brand} {PRODUCT.model} · {FINISH[finish].name}</span><span>{formatUSD(PRODUCT.price)}</span></div>
                    {dark && (
                      <AnimatePresence>
                        {revealed && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden text-red-300">
                            <div className="flex justify-between"><span>Handling fee</span><span>{formatUSD(PRODUCT.handling)}</span></div>
                            <div className="flex justify-between"><span>Platform service fee</span><span>{formatUSD(PRODUCT.platform)}</span></div>
                            {warranty && <div className="flex justify-between"><span>Extended warranty</span><span>{formatUSD(PRODUCT.warranty)}</span></div>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                    {!dark && accidental && <div className="flex justify-between"><span className="text-white/70">2-Year Accidental Care (optional)</span><span>{formatUSD(PRODUCT.accidental)}</span></div>}
                    <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
                      <span className="font-semibold">Total</span>
                      <motion.span
                        key={dark ? String(revealed) : 'fixed'}
                        initial={{ scale: 1.2, color: dark && revealed ? '#f87171' : '#fff' }}
                        animate={{ scale: 1, color: dark && revealed ? '#f87171' : '#fff' }}
                        className="text-2xl font-extrabold"
                      >
                        {formatUSD(dark && !revealed ? PRODUCT.price : total)}
                      </motion.span>
                    </div>
                    {!dark && <p className="flex items-center gap-2 text-emerald-300"><Check className="h-4 w-4" /> All-inclusive total. Zero hidden fees.</p>}
                  </div>
                  <button onClick={() => setStep('survey')} disabled={dark && !revealed} className="mt-6 w-full rounded-full bg-white py-4 font-semibold text-black disabled:opacity-40">
                    {dark ? (revealed ? 'Place order' : 'Calculating...') : `Confirm & pay ${formatUSD(total)}`}
                  </button>
                </>
              )}

              {step === 'survey' && (
                <>
                  <h3 className="mb-1 text-xl font-bold">Quick 3-question survey</h3>
                  <p className="mb-5 text-sm text-white/50">Order complete (simulated). Rate your experience.{isControlledStudy && sheetEnabled ? (hasLogged(mode) ? ' This device already logged a response for this mode, so this replay is not saved.' : ' Your anonymous answers and checkout time are saved for research.') : ' Public sandbox: your answers stay on this device.'}</p>
                  <div className="space-y-5">
                    {SURVEY.map((s, qi) => (
                      <div key={s.id}>
                        <p className="mb-2 text-sm font-medium">{s.q}</p>
                        <div className="flex flex-wrap gap-2">
                          {s.options.map((o, oi) => (
                            <button
                              key={o} onClick={() => setAnswers(answers.map((a, i) => (i === qi ? oi + 1 : a)))}
                              className={`rounded-full border px-3 py-1.5 text-xs ${answers[qi] === oi + 1 ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                            >{o}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={submitSurvey} disabled={answers.includes(-1)} className="mt-6 w-full rounded-full bg-white py-3.5 font-semibold text-black disabled:opacity-40">Submit and see debrief</button>
                </>
              )}

              {step === 'debrief' && last.current && (
                <>
                  <button aria-label="Close" onClick={() => setStep('closed')} className="absolute right-4 top-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
                  <h3 className="mb-2 text-xl font-bold">Research debriefing</h3>
                  {!isControlledStudy && (
                    <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-xl">
                      Public Sandbox Mode — Official N=24 dataset protected
                    </p>
                  )}
                  {replay && (
                    <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-xl">
                      Sandbox demo replay — original session response already logged
                    </p>
                  )}
                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    No real purchase was made and no personal data was collected.{isControlledStudy && sheetEnabled && !replay && ' Your anonymous ratings and checkout time were added to the research dataset.'} Participation is voluntary and you can stop at any time.{' '}
                    {last.current.mode === 'dark'
                      ? 'You just saw a fake countdown, invented scarcity, a pre-checked warranty and drip pricing, all known dark patterns.'
                      : 'You just saw a transparent price, no manufactured urgency and no pre-selected extras.'}{' '}
                    Switch modes and try the other one to compare.
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-white/10 text-sm">
                    <div className="grid grid-cols-3 bg-white/5 p-2 text-xs text-white/50"><span>Session metric</span><span>Traditional</span><span>Ethical</span></div>
                    {([
                      ['Checkouts', (m: UXMode) => String(sessions.filter((r) => r.mode === m).length)],
                      ['Avg seconds', (m: UXMode) => avg(m, (r) => r.seconds)],
                      ['Avg ease (1-5)', (m: UXMode) => avg(m, (r) => r.answers[0])],
                      ['Avg trust (1-5)', (m: UXMode) => avg(m, (r) => r.answers[1])],
                      ['Avg pressure (1-5)', (m: UXMode) => avg(m, (r) => r.answers[2])],
                    ] as const).map(([l, f]) => (
                      <div key={l} className="grid grid-cols-3 border-t border-white/10 p-2"><span className="text-white/60">{l}</span><span>{f('dark')}</span><span>{f('ethical')}</span></div>
                    ))}
                  </div>
                  {showContinue && (
                    <button
                      onClick={continueToOther}
                      className="mt-6 w-full rounded-full border border-emerald-400/40 bg-emerald-400/10 py-3.5 font-semibold text-emerald-200 hover:bg-emerald-400/20"
                    >
                      Continue to {otherMode === 'dark' ? 'Mode A: Traditional UI' : 'Mode B: Ethical UI'} →
                    </button>
                  )}
                  <button
                    onClick={() => setStep('closed')}
                    className={`w-full rounded-full py-3.5 font-semibold ${showContinue ? 'mt-3 border border-white/15 bg-white/5 text-white hover:bg-white/10' : 'mt-6 bg-white text-black'}`}
                  >
                    Back to storefront
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
         {/* Mobile-only Up/Down scroll helper */}
   <div className="fixed bottom-3 left-3 z-30 flex items-center gap-1 rounded-full border border-white/15 bg-[#0B0D12]/90 p-1 shadow-2xl backdrop-blur-xl md:hidden">
     <button
       type="button"
       aria-label="Scroll up"
       onClick={() => window.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' })}
       className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 active:bg-white/20"
     >
       <ChevronUp className="h-4 w-4" />
     </button>
     <div className="h-4 w-px bg-white/15" />
     <button
       type="button"
       aria-label="Scroll down"
       onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
       className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 active:bg-white/20"
     >
       <ChevronDown className="h-4 w-4" />
     </button>
   </div>

    </section>
  );
}