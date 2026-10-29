import { CONCERN_IDS, WATCHED, concernInfo, type ConcernId } from "./concerns";

// Change detection against a person's own baseline.
//
// Photo-based scores move a little between shots even when skin hasn't
// changed (lighting, angle, camera). So a change only counts when it is
// bigger than that measurement noise. We use the standard "minimal
// detectable change" from test-retest reliability:
//
//   SEM   = within-person standard deviation of repeated baseline scans
//   MDC95 = 1.96 * sqrt(2) * SEM
//
// A difference larger than MDC95 is unlikely (< 5%) to be noise alone.
// With only a few baseline scans the SD estimate is unstable, so MDC is
// never allowed below MIN_MDC.

export const MIN_MDC = 3; // concern-level points; see /method for how this was chosen
export const MIN_BASELINE_SCANS = 3;

export interface BaselineStat {
  n: number;
  mean: number;
  sd: number | null;
  mdc: number;
}

export type Baseline = Record<ConcernId, BaselineStat>;

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sampleSd(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function mdcFromSd(sd: number | null): number {
  if (sd === null) return MIN_MDC;
  return Math.max(MIN_MDC, 1.96 * Math.SQRT2 * sd);
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function computeBaseline(levels: Record<ConcernId, number>[]): Baseline {
  const out = {} as Baseline;
  for (const id of CONCERN_IDS) {
    const xs = levels.map((l) => l[id]).filter((x) => Number.isFinite(x));
    const sd = sampleSd(xs);
    out[id] = {
      n: xs.length,
      mean: xs.length ? round1(mean(xs)) : NaN,
      sd: sd === null ? null : round1(sd),
      mdc: round1(mdcFromSd(sd)),
    };
  }
  return out;
}

export type ChangeStatus = "worse" | "better" | "stable";

export interface Change {
  id: ConcernId;
  value: number;
  delta: number;
  status: ChangeStatus;
  // delta exceeds twice the detectable change: a large, clear shift
  marked: boolean;
}

export function compare(levels: Record<ConcernId, number>, baseline: Baseline): Change[] {
  return CONCERN_IDS.map((id) => {
    const b = baseline[id];
    const value = levels[id];
    const delta = round1(value - b.mean);
    const status: ChangeStatus = delta > b.mdc ? "worse" : delta < -b.mdc ? "better" : "stable";
    return { id, value, delta, status, marked: status === "worse" && delta > 2 * b.mdc };
  });
}

// ---------- symptoms the patient reports alongside a scan ----------

export type SymptomId =
  | "fever"
  | "blisters"
  | "infection"
  | "pain"
  | "spreading"
  | "eyes"
  | "itch"
  | "dry"
  | "sleep";

export interface Symptom {
  id: SymptomId;
  label: string;
  urgent: boolean;
}

// "urgent" items are the ones standard patient guidance says to report to
// the care team the same day rather than waiting for the next visit.
export const SYMPTOMS: Symptom[] = [
  { id: "fever", label: "Fever or chills", urgent: true },
  { id: "blisters", label: "Blisters, peeling or open skin", urgent: true },
  { id: "infection", label: "Yellow crusts, pus or skin that feels hot", urgent: true },
  { id: "pain", label: "Rash that is painful or stops me doing daily things", urgent: true },
  { id: "spreading", label: "Rash spreading quickly to large areas", urgent: true },
  { id: "eyes", label: "Sore, red or swollen eyes", urgent: true },
  { id: "itch", label: "Itching", urgent: false },
  { id: "dry", label: "Tight, dry or cracked skin", urgent: false },
  { id: "sleep", label: "Skin keeping me awake", urgent: false },
];

export type Guidance = "urgent" | "discuss" | "steady";

export interface GuidanceResult {
  level: Guidance;
  reasons: string[];
}

export function guidance(changes: Change[] | null, symptoms: SymptomId[]): GuidanceResult {
  const urgent = SYMPTOMS.filter((s) => s.urgent && symptoms.includes(s.id));
  if (urgent.length) {
    return { level: "urgent", reasons: urgent.map((s) => s.label) };
  }
  const watchedIds = new Set(WATCHED.map((w) => w.id));
  const worse = (changes ?? []).filter((c) => watchedIds.has(c.id) && c.status === "worse");
  const reported = SYMPTOMS.filter((s) => !s.urgent && symptoms.includes(s.id));
  if (worse.length || reported.length) {
    return {
      level: "discuss",
      reasons: [
        ...worse.map((c) => `${concernInfo(c.id).label} up ${c.delta} points, beyond your normal photo-to-photo variation`),
        ...reported.map((s) => s.label),
      ],
    };
  }
  return { level: "steady", reasons: [] };
}

// ---------- treatment cycle position ----------

export function cyclePosition(
  date: Date,
  firstCycleStart: Date,
  cycleLengthDays: number,
): { cycle: number; day: number } | null {
  const ms = 86_400_000;
  const start = Date.UTC(firstCycleStart.getFullYear(), firstCycleStart.getMonth(), firstCycleStart.getDate());
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((d - start) / ms);
  if (days < 0 || cycleLengthDays <= 0) return null;
  return { cycle: Math.floor(days / cycleLengthDays) + 1, day: (days % cycleLengthDays) + 1 };
}
