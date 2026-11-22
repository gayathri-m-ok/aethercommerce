'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, FileText, X } from 'lucide-react';
import type { SessionRecord } from './StorefrontSandbox';
import { fetchRows, sheetEnabled, summarize, type ModeStats, type SheetRow } from '@/lib/sheet';

const TABS = ['Problem & UX Laws', 'Results (N=24)', 'Method & Ethics'] as const;
const TAB_TITLES = ['Research Problem & UX Laws', ] as const;

type Block = { label: string; text: string; italic?: boolean; accent?: boolean };

const ACCORDION: { n: string; title: string; tag: string; blocks: Block[] }[] = [
  {
    n: '01', title: 'Problem Origin & Core Research Question', tag: 'RQ',
    blocks: [
      { label: 'Observation', text: 'Modern online checkouts combine artificial countdown urgency ("Only 2 left!") with last-step drip pricing ($207 → $263), causing user frustration, distrust, and cart abandonment.' },
      { label: 'Experimental Approach', italic: true, text: 'To test this empirically, I engineered two parallel interactive prototypes of the same checkout flow: a Baseline Dark-Pattern Condition (Mode A) exhibiting temporal scarcity and drip pricing, and an Ethical Neuro-Adaptive Solution (Mode B) built on cognitive load and price-lock principles.' },
      { label: 'Core Research Question (RQ)', accent: true, text: 'How does replacing temporal scarcity and hidden final-step fees with calm, price-locked transparency impact checkout latency, NASA-TLX cognitive load, and calibrated consumer trust?' },
    ],
  },
  {
    n: '02', title: 'Literature Briefing & Research Gap', tag: 'LIT',
    blocks: [
      { label: 'Mathur et al. (ACM CSCW 2019)', text: 'Large-scale crawl of shopping websites that catalogued dark patterns including Sneak into Basket, Hidden Costs (drip pricing), Low-stock messages and Countdown timers (fake scarcity and urgency).' },
      { label: 'Luguri & Strahilevitz (2021) & KFTC dark-pattern guidance', text: 'Experiments showing dark patterns sharply raise unwanted acceptance while the most aggressive ones provoke consumer backlash and distrust. Korean regulators (KFTC) have likewise targeted deceptive e-commerce practices such as false urgency and hidden extra charges.' },
      { label: 'Research Gap', accent: true, text: 'Prior studies audit dark patterns statically. AetherCommerce isolates and measures live workload (NASA-TLX) and checkout trust in an interactive A/B sandbox.' },
    ],
  },
  {
    n: '03', title: "Hick's Law", tag: 'H1',
    blocks: [
      { label: 'Mechanism (Hick, 1952; Hyman, 1953)', text: 'Decision latency grows logarithmically with the number and complexity of options. Mode B removes pre-checked add-ons and cross-sells, leaving one clear path to checkout.' },
      { label: 'Hypothesis (H1)', accent: true, italic: true, text: 'Eliminating secondary pre-checked choices reduces checkout decision time.' },
    ],
  },
  {
    n: '04', title: "Fitts's Law", tag: 'H2',
    blocks: [
      { label: 'Mechanism (Fitts, 1954)', text: 'Pointing time depends on target size and distance. Mode B uses high-affordance primary targets of 48px or larger, while Mode A hides the decline path behind small, low-contrast links.' },
      { label: 'Hypothesis (H2)', accent: true, italic: true, text: 'High-affordance target geometry prevents accidental opt-ins and motor hesitation.' },
    ],
  },
  {
    n: '05', title: "Sweller's Cognitive Load Theory", tag: 'H3',
    blocks: [
      { label: 'Mechanism (Sweller, 1988)', text: 'Working memory is limited. Mode B eliminates extraneous urgency and scarcity noise (countdowns, stock alerts, viewer counts) so effort goes to the purchase decision itself.' },
      { label: 'Hypothesis (H3)', accent: true, italic: true, text: 'Removing temporal urgency alarms significantly lowers subjective workload (NASA-TLX).' },
    ],
  },
  {
    n: '06', title: 'Dual-Process Theory & Drip Pricing', tag: 'H4',
    blocks: [
      { label: 'Mechanism (Kahneman, 2011; Mathur et al., 2019)', text: 'Fake urgency triggers fast System 1 rushing, then fees revealed at the last step (from $207 to $263) force a slow System 2 re-evaluation. The result is distrust and abandonment, which Mode B avoids with an honest all-inclusive total.' },
      { label: 'Hypothesis (H4)', accent: true, italic: true, text: 'Upfront all-inclusive pricing preserves consumer trust and cuts cart abandonment.' },
    ],
  },
];

const pct = (d: number, e: number) => {
  const v = Math.round(((e - d) / d) * 100);
  return `${v > 0 ? '+' : ''}${v}%`;
};

const METRICS = [
  { label: 'NASA-TLX Cognitive Load', dark: 74.2, ethical: 41.5, max: 100, fmt: (v: number) => v.toFixed(1), delta: pct(74.2, 41.5) + ' reduction' },
  { label: 'Checkout Abandonment Rate', dark: 62.5, ethical: 10.4, max: 100, fmt: (v: number) => `${v.toFixed(1)}%`, delta: `-${(62.5 - 10.4).toFixed(1)} pts drop` },
  { label: 'Consumer Trust Rating (7-pt Likert)', dark: 2.8, ethical: 6.4, max: 7, fmt: (v: number) => `${v.toFixed(1)} / 7`, delta: pct(2.8, 6.4) + ' increase' },
  { label: 'SUS Usability Score', dark: 51.0, ethical: 86.5, max: 100, fmt: (v: number) => `${v.toFixed(1)} / 100`, delta: 'Grade A usability' },
];

const METHOD = [
  { title: 'Counterbalanced within-subjects A/B', body: 'All 24 participants complete both the Dark-Pattern checkout (Mode A) and the Ethical checkout (Mode B). Order is counterbalanced across participants to control for learning and fatigue effects.' },
  { title: 'Think-aloud verbalization', body: 'Participants narrate their reasoning during each task. This captures moments of confusion, suspicion and pressure that questionnaires alone miss.' },
  { title: 'Measures', body: 'NASA-TLX for cognitive load, a 7-point Likert scale for trust, the System Usability Scale (SUS), plus task time and checkout abandonment.' },
  { title: 'IRB-aligned debriefing protocol', body: 'Informed consent before the task, simulated payment only, voluntary participation, and the right to withdraw at any time. Each participant receives an immediate debrief explaining which manipulative elements they saw and why.' },
];

/* ---------- Live sandbox metrics (Google Sheet) with baseline fallback ---------- */
type Source = 'live' | 'baseline' | 'offline';

const BASELINE: { dark: ModeStats; ethical: ModeStats } = {
  dark: { n: 12, seconds: 41.2, ease: 2.4, trust: 2.1, pressure: 4.2 },
  ethical: { n: 12, seconds: 23.0, ease: 4.5, trust: 4.6, pressure: 1.6 },
};

const LIVE_METRICS = [
  { label: 'Avg checkout time', get: (s: ModeStats) => s.seconds, fmt: (v: number) => `${v.toFixed(1)} s`, max: (d: number, e: number) => Math.max(d, e, 1) * 1.1 },
  { label: 'Avg ease (1-5)', get: (s: ModeStats) => s.ease, fmt: (v: number) => `${v.toFixed(1)} / 5`, max: () => 5 },
  { label: 'Avg trust (1-5)', get: (s: ModeStats) => s.trust, fmt: (v: number) => `${v.toFixed(1)} / 5`, max: () => 5 },
  { label: 'Avg pressure (1-5)', get: (s: ModeStats) => s.pressure, fmt: (v: number) => `${v.toFixed(1)} / 5`, max: () => 5 },
];

function LiveSection({ dark, ethical, source, reduce }: { dark: ModeStats; ethical: ModeStats; source: Source; reduce: boolean }) {
  const badge =
    source === 'live'
      ? { text: `LIVE · N = ${dark.n + ethical.n}`, cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' }
      : source === 'offline'
        ? { text: 'OFFLINE · BASELINE SAMPLE', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' }
        : { text: 'BASELINE SAMPLE', cls: 'border-white/15 bg-white/5 text-slate-300' };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">Sandbox sessions</h4>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider ${badge.cls}`}>
          {source === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
          {badge.text}
        </span>
      </div>
      <p className="mb-5 text-xs leading-relaxed text-slate-500">
        Traditional n = {dark.n} · Ethical n = {ethical.n}.{' '}
        {source === 'live'
          ? 'Anonymous ratings from verified study participants (?study=1), refreshed every few seconds.'
          : 'Illustrative baseline until live sessions arrive.'}
      </p>
      {LIVE_METRICS.map((m) => {
        const d = m.get(dark);
        const e = m.get(ethical);
        const max = m.max(d, e);
        return (
          <div key={m.label} className="mb-4 last:mb-0">
            <p className="mb-2 text-sm text-white/90">{m.label}</p>
            {([['A', d, dark.n, 'bg-red-400'], ['B', e, ethical.n, 'bg-emerald-400']] as const).map(([k, v, n, c]) => {
              const w = n > 0 ? Math.min(100, (v / max) * 100) : 0;
              return (
                <div key={k} className="mb-1.5 flex items-center gap-3">
                  <span className="w-4 font-[family-name:var(--font-mono)] text-[11px] text-slate-500">{k}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: reduce ? `${w}%` : 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${c}`}
                    />
                  </div>
                  <span className="w-16 text-right font-[family-name:var(--font-mono)] text-xs text-slate-300">{n > 0 ? m.fmt(v) : '-'}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function CaseStudyDrawer({
  isOpen, setIsOpen, sessions = [],
}: { isOpen: boolean; setIsOpen: (v: boolean) => void; sessions?: SessionRecord[] }) {
  const reduce = !!useReducedMotion();
  const [tab, setTab] = useState(0);
  const [openRows, setOpenRows] = useState<number[]>([0]); // 01 open by default
  const toggleRow = (i: number) => setOpenRows((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]));
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading');

    const downloadCSV = () => {
    const header = 'Participant_ID,Condition,Duration_Sec,Ease_1to5,Trust_1to5,Pressure_1to5,Timestamp';
    const body = rows.length
  ? rows.map((r, idx) => `P${String(idx + 1).padStart(2, '0')},${r.mode},${r.durationSec},${r.ease},${r.trust},${r.pressure},${(r as { timestamp?: string }).timestamp || ''}`)
      : sessions.map((s, idx) => `P${String(idx + 1).padStart(2, '0')},${s.mode},${s.seconds},${s.answers[0]},${s.answers[1]},${s.answers[2]},local`);
    const csv = [header, ...(body.length ? body : ['P01,sample_placeholder,0,0,0,0,pending_N24'])].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AetherCommerce_HCI_Dataset_N${rows.length || sessions.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Real-time: fetch when opened, shortly after a new submission, and every 15s while open
  useEffect(() => {
    if (!isOpen || !sheetEnabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetchRows();
        if (!cancelled) { setRows(r); setStatus('live'); }
      } catch {
        if (!cancelled) setStatus('offline');
      }
    };
    const first = setTimeout(load, sessions.length > 0 ? 2000 : 0);
    const poll = setInterval(load, 15000);
    return () => { cancelled = true; clearTimeout(first); clearInterval(poll); };
  }, [isOpen, sessions.length]);

  const hasLive = sheetEnabled && status === 'live' && rows.length > 0;
  const stats = hasLive ? summarize(rows) : BASELINE;
  const source: Source = hasLive ? 'live' : sheetEnabled && status === 'offline' ? 'offline' : 'baseline';

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Floating trigger pill */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3 right-3 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-[#0B0D12]/90 px-3 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl transition hover:border-emerald-400/40 hover:bg-white/10 sm:bottom-6 sm:right-6 sm:px-4 sm:py-2.5 sm:text-sm"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <FileText className="h-4 w-4" />
        <span className="font-[family-name:var(--font-mono)] text-xs tracking-wide">UX Case Study File</span>
      </button>

                  <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"

          />
        )}
        {isOpen && (
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="AetherCommerce HCI Evaluation File"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', pointerEvents: 'none' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0B0D12]/95 text-[#F8FAFC] backdrop-blur-2xl lg:max-w-[50vw]"
          >


              {/* Header */}
              <div className="flex items-start justify-between gap-4 p-6 pb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight sm:text-xl">AetherCommerce — HCI Evaluation File</h2>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">Controlled A/B Checkout Study · Behavioral UX</p>
                </div>
                <button aria-label="Close" onClick={() => setIsOpen(false)} className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="mx-6 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1" role="tablist">
                {TABS.map((t, i) => (
                  <button
                    key={t} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                    className="relative flex-1 rounded-full px-2 py-2 text-[11px] font-semibold sm:text-sm"
                  >
                    {tab === i && <motion.span layoutId="drawer-tab" className="absolute inset-0 rounded-full bg-white/15" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className={`relative ${tab === i ? 'text-white' : 'text-white/50'}`}>{t}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-slate-400">{TAB_TITLES[tab]}</h3>
                {tab === 0 && (
                  <div className="space-y-3">
                    {ACCORDION.map((row, i) => {
                      const isOpen = openRows.includes(i);
                      return (
                        <div key={row.n} className="rounded-2xl border border-white/10 bg-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => toggleRow(i)}
                            aria-expanded={isOpen}
                            aria-controls={`acc-panel-${i}`}
                            className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                          >
                            <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">{row.n}</span>
                            <span className="flex-1 text-sm font-semibold">{row.title}</span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-slate-300">{row.tag}</span>
                            <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className="flex">
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                id={`acc-panel-${i}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-4">
                                  {row.blocks.map((b) => (
                                    <div key={b.label} className={b.accent ? 'rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3' : ''}>
                                      <p className={`mb-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] ${b.accent ? 'text-emerald-300' : 'text-slate-500'}`}>{b.label}</p>
                                      <p className={`text-sm leading-relaxed text-slate-300 ${b.italic ? 'italic' : ''}`}>{b.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === 1 && (
                  <div className="space-y-7">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">Empirical Evaluation &amp; Live Telemetry</h3>
                        <p className="text-xs text-slate-400">Live participant telemetry & target benchmarks</p>
                      </div>
                      <button
                        onClick={downloadCSV}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-[family-name:var(--font-mono)] text-xs text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-200"
                      >
                        ↓ Download Anonymized Dataset (.CSV)
                      </button>
                    </div>

                    <div className="flex gap-5 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-400" /> Mode A: Dark-Pattern UI</span>
                      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Mode B: Ethical Neuro-Adaptive UI</span>
                    </div>
                    <LiveSection dark={stats.dark} ethical={stats.ethical} source={source} reduce={reduce} />
                    <h4 className="pt-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-slate-400">Study metrics (N = 24)</h4>
                    {METRICS.map((m, i) => (
                      <div key={m.label}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <span className="text-sm text-white/90">{m.label}</span>
                          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-xs text-emerald-300">{m.delta}</span>
                        </div>
                        {([['A', m.dark, 'bg-red-400'], ['B', m.ethical, 'bg-emerald-400']] as const).map(([k, v, c]) => (
                          <div key={k} className="mb-2 flex items-center gap-3">
                            <span className="w-4 font-[family-name:var(--font-mono)] text-[11px] text-slate-500">{k}</span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                initial={{ width: reduce ? `${(v / m.max) * 100}%` : 0 }}
                                animate={{ width: `${(v / m.max) * 100}%` }}
                                transition={{ duration: 1, delay: 0.12 * i, ease: [0.16, 1, 0.3, 1] }}
                                className={`h-full rounded-full ${c}`}
                              />
                            </div>
                            <span className="w-20 text-right font-[family-name:var(--font-mono)] text-xs text-slate-300">{m.fmt(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <p className="text-xs leading-relaxed text-slate-500">
                      Values are illustrative prototype figures that show how results will be reported. The live sandbox records session ratings for the planned study.
                    </p>
                    <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                      Your live session: {sessions.length} simulated checkout{sessions.length === 1 ? '' : 's'} completed.
                    </p>
                  </div>
                )}

                {tab === 2 && (
                  <div className="space-y-4">
                    {METHOD.map((m) => (
                      <div key={m.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <h3 className="mb-2 font-semibold">{m.title}</h3>
                        <p className="text-sm leading-relaxed text-slate-400">{m.body}</p>
                      </div>
                    ))}
                                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
                      <h3 className="mb-3 font-semibold">Design Iterations &amp; Engineering Trade-Offs</h3>
                      <div className="space-y-3 text-sm leading-relaxed text-slate-400">
                        <p><span className="font-semibold text-slate-200">1. Adaptive 3D Studio Lighting:</span> Switched from uniform dark backdrops to finish-adaptive studio pedestals (#F8FAFC → #CBD5E1 for Obsidian Black; #07080B for Studio White) to maintain perceptual contrast without biasing condition aesthetics.</p>
                        <p><span className="font-semibold text-slate-200">2. Preventing Mode B Under-Information Bias:</span> Balanced calm visual hierarchy with 3 chunked hardware spec pills (40h Battery, Adaptive ANC, 2-Yr Warranty) and verified rating distribution so Mode B reduces clutter without sacrificing decision confidence.</p>
                        <p><span className="font-semibold text-slate-200">3. Interactive UX Principle Micro-Demos:</span> Replaced static law definitions with interactive Framer Motion sandboxes (Hick/Fitts trap transitions and drip-pricing lock) to make cognitive mechanisms inspectable by reviewers.</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-400/[0.06] p-5">
                      <h3 className="mb-3 font-semibold">Limitations &amp; Future Lab Work</h3>
                      <div className="space-y-3 text-sm leading-relaxed text-slate-400">
                        <p><span className="font-semibold text-slate-200">Limitation:</span> Cognitive load is self-reported (NASA-TLX) and payment stakes are simulated, so real-money behavior may differ.</p>
                        <p><span className="font-semibold text-slate-200">Future MS Lab Direction:</span> Integrating webcam eye-tracking (WebGazer.js) and pupillometry to validate gaze fixation under artificial urgency, adding objective attention and arousal measures to the self-report data.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                        </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
