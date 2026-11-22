export type UXMode = 'dark' | 'ethical';

export const PRODUCT = {
  name: 'Aether One — Headphones + Watch Set',
  tagline: 'Studio-grade audio. Quiet, precise, yours.',
  basePrice: 290000,
  hiddenFees: [
    { label: 'Handling fee', amount: 38000 },
    { label: 'Platform service fee', amount: 24000 },
    { label: 'Pre-selected protection plan', amount: 16000 },
  ],
  countdownSeconds: 14 * 60 + 59,
  fakeStock: 2,
};

export const formatKRW = (n: number): string => '₩' + n.toLocaleString('en-US');

export const darkTotal = (): number =>
  PRODUCT.basePrice + PRODUCT.hiddenFees.reduce((s, f) => s + f.amount, 0); // ₩368,000

export const ADDONS = [
  { id: 'care', label: 'Aether Care+ (2 yr)', price: 16000 },
  { id: 'case', label: 'Premium travel case', price: 12000 },
  { id: 'news', label: 'Partner offers & newsletter', price: 0 },
];

export const HOTSPOTS = [
  { id: 'price', x: 78, y: 18, text: 'Total shown up front: no price surprises at checkout (reduces Sweller extraneous load).' },
  { id: 'cta', x: 50, y: 82, text: 'One primary action: fewer choices, faster decisions (Hick’s Law).' },
  { id: 'badge', x: 22, y: 30, text: 'Verified integrity badge replaces fake urgency with a real trust signal.' },
  { id: 'target', x: 82, y: 70, text: 'Large, thumb-reachable button: shorter pointing time (Fitts’s Law).' },
];

export const SURVEY = [
  { id: 'ease', q: 'How clear and easy was it to check your items, fees, and options before placing the order?', options: ['Very hard', 'Hard', 'Neutral', 'Easy', 'Very easy'] },
  { id: 'trust', q: 'How confident and trusting did you feel that the final total was honest with no hidden fees or unwanted add-ons?', options: ['Not at all', 'A little', 'Somewhat', 'Mostly', 'Completely'] },
  { id: 'pressure', q: 'How much time pressure, urgency, or stress did the interface make you feel while deciding?', options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'] },
];

export const MARQUEE = [
  "Hick's Law", "Fitts's Law", 'Cognitive Load Theory', 'Drip Pricing', 'False Scarcity',
  'System Usability Scale', 'Consumer Trust', 'Within-Subjects Design', 'Informed Consent', 'Choice Architecture',
];

export const CASE_STUDY = {
  tabs: ['Problem & Laws', 'Results', 'Method'] as const,
  laws: [
    { name: "Hick's Law", body: 'Decision time grows with the number and complexity of choices. Dark patterns inflate options and noise.' },
    { name: "Fitts's Law", body: 'Target acquisition time depends on distance and size. Hidden or tiny opt-outs raise effort on purpose.' },
    { name: "Sweller's Cognitive Load Theory", body: 'Working memory is limited. Extraneous load from timers, alerts and surprise fees leaves less capacity for judgment.' },
    { name: 'Drip Pricing & False Scarcity', body: 'Fees revealed late and invented urgency exploit commitment and loss aversion, eroding trust.' },
  ],
  results: [
    { label: 'Cognitive Load Score', delta: '-44%', pct: 44, good: true },
    { label: 'Checkout Trust Rating', delta: '+68%', pct: 68, good: true },
    { label: 'Task Completion Speed', delta: '1.8x faster', pct: 80, good: true },
    { label: 'Cart Abandonment', delta: '-52%', pct: 52, good: true },
  ],
  resultsNote: 'N = 24, within-subjects. Illustrative design-study figures for portfolio demonstration.',
  method: [
    { title: 'Design', body: 'Within-subjects, counterbalanced A/B: each participant completes both the dark-pattern and ethical checkout, order alternated across participants.' },
    { title: 'Measures', body: 'System Usability Scale (SUS), a 3-item post-task survey (ease, trust, pressure), task time and abandonment.' },
    { title: 'Ethical debriefing', body: 'IRB-aligned: informed consent, no real payment, immediate debrief explaining the manipulative elements, and the right to withdraw.' },
  ],
};
