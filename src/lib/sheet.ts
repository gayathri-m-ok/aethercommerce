// Free real-time data collection through a Google Apps Script Web App (see apps-script/Code.gs).
// Paste your Web App URL below (it ends with /exec), OR set NEXT_PUBLIC_SHEET_URL in .env.local / Vercel.
export const SHEET_URL: string =
  process.env.NEXT_PUBLIC_SHEET_URL ||
  'https://script.google.com/macros/s/AKfycbwBV7ScRRdy9KQRYZFpEysoEmQ16y4xGQPLTP7rys9WNZApjegOOMHKUtkGmePR9g7G/exec';

export const sheetEnabled = /^https:\/\/script\.google\.com\/macros\//.test(SHEET_URL);

export type SheetMode = 'dark' | 'ethical';
export type Sequence = 'AB' | 'BA';

export interface SheetRow {
  mode: SheetMode;
  durationSec: number;
  ease: number;
  trust: number;
  pressure: number;
  sequence?: Sequence;
  accidentalAddon?: boolean;
  timestamp?: string;
}

/** What the sandbox sends for each controlled-study response */
export interface LogPayload extends SheetRow {
  sequence: Sequence;
  accidentalAddon: boolean;
}

export interface ModeStats {
  n: number;
  seconds: number;
  ease: number;
  trust: number;
  pressure: number;
}

/** Non-blocking, fire-and-forget POST. text/plain + no-cors avoids a CORS preflight (Apps Script cannot answer one). */
export function logSession(row: LogPayload): void {
  if (!sheetEnabled) return;
  try {
    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(row),
    }).catch(() => {});
  } catch {
    /* never block the UI */
  }
}

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export async function fetchRows(): Promise<SheetRow[]> {
  const res = await fetch(SHEET_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet responded ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('Unexpected sheet response');
  const rows: SheetRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    if ((r.mode === 'dark' || r.mode === 'ethical') && inRange(r.durationSec, 1, 1800) && inRange(r.ease, 1, 5) && inRange(r.trust, 1, 5) && inRange(r.pressure, 1, 5)) {
      rows.push({
        mode: r.mode,
        durationSec: r.durationSec,
        ease: r.ease,
        trust: r.trust,
        pressure: r.pressure,
        sequence: r.sequence === 'AB' || r.sequence === 'BA' ? r.sequence : undefined,
        accidentalAddon: typeof r.accidentalAddon === 'boolean' ? r.accidentalAddon : undefined,
        timestamp: typeof r.timestamp === 'string' ? r.timestamp : undefined,
      });
    }
  }
  return rows;
}

const empty = (): ModeStats => ({ n: 0, seconds: 0, ease: 0, trust: 0, pressure: 0 });

export function summarize(rows: SheetRow[]): Record<SheetMode, ModeStats> {
  const acc: Record<SheetMode, ModeStats> = { dark: empty(), ethical: empty() };
  for (const r of rows) {
    const s = acc[r.mode];
    s.n += 1;
    s.seconds += r.durationSec;
    s.ease += r.ease;
    s.trust += r.trust;
    s.pressure += r.pressure;
  }
  for (const m of ['dark', 'ethical'] as const) {
    const s = acc[m];
    if (s.n > 0) { s.seconds /= s.n; s.ease /= s.n; s.trust /= s.n; s.pressure /= s.n; }
  }
  return acc;
}