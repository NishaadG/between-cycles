// Hair density over treatment, compared to the person's first checks.
//
// The analyzer returns one of four documented levels plus a continuous
// score (higher = denser). The score's range isn't documented: in our
// tests a "Medium" photo scored 1.71 and a "Low" one 0.92. So the level
// is the headline and the score is only used for the trend. We don't yet
// have a repeatability study for it, so changes smaller than HAIR_NOISE
// are reported as "within photo-to-photo noise".

export const HAIR_NOISE = 0.5;

export interface HairPoint {
  takenAt: string;
  value: number;
}

export type HairStatus = "baseline" | "steady" | "thinner" | "fuller";

export interface HairSummary {
  baseline: number | null;
  latest: number | null;
  delta: number | null;
  status: HairStatus;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

// Baseline = mean of up to the first two checks.
export function summarizeHair(points: HairPoint[]): HairSummary {
  const sorted = [...points].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  if (sorted.length === 0) return { baseline: null, latest: null, delta: null, status: "baseline" };
  const base = sorted.slice(0, 2);
  const baseline = round2(base.reduce((a, p) => a + p.value, 0) / base.length);
  if (sorted.length <= base.length) return { baseline, latest: sorted.at(-1)!.value, delta: null, status: "baseline" };
  const latest = sorted.at(-1)!.value;
  const delta = round2(latest - baseline);
  const status: HairStatus = delta <= -HAIR_NOISE ? "thinner" : delta >= HAIR_NOISE ? "fuller" : "steady";
  return { baseline, latest, delta, status };
}

const LEVELS: Record<string, number> = {
  "extremely low density": 1,
  "low density": 2,
  "medium density": 3,
  "high density": 4,
};

// Level 1-4 from the API's own term; null if the term is unknown.
export function densityLevel(term: string): number | null {
  return LEVELS[term.trim().toLowerCase()] ?? null;
}
