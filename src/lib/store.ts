"use client";

import { clear, get, set } from "idb-keyval";
import { CONCERN_IDS, concernLevel, type ConcernId } from "./concerns";
import type { SymptomId } from "./stats";
import type { SkinAnalysis, TryOnKind } from "./types";

// Everything a patient records stays in this browser (IndexedDB).
// The server only relays photos to the analysis API and keeps nothing.

export type Treatment = "egfr" | "chemo" | "immuno" | "other" | "unsure";

export const TREATMENTS: { id: Treatment; label: string }[] = [
  { id: "egfr", label: "Targeted therapy (EGFR inhibitor, e.g. erlotinib, cetuximab)" },
  { id: "chemo", label: "Chemotherapy" },
  { id: "immuno", label: "Immunotherapy" },
  { id: "other", label: "Something else" },
  { id: "unsure", label: "Not sure yet" },
];

export interface Profile {
  name: string;
  treatment: Treatment;
  cycleLength: number;
  firstCycleStart: string; // YYYY-MM-DD
  demo?: boolean;
}

export interface Scan {
  id: string;
  takenAt: string;
  kind: "baseline" | "checkin";
  analysis: SkinAnalysis;
  photo?: string; // small JPEG data URL
  symptoms: SymptomId[];
  demo?: boolean;
}

export interface SavedTryOn {
  id: string;
  kind: TryOnKind;
  label: string;
  image: string;
  createdAt: string;
}

export const getProfile = () => get<Profile>("profile");
export const saveProfile = (p: Profile) => set("profile", p);

export async function listScans(): Promise<Scan[]> {
  const scans = (await get<Scan[]>("scans")) ?? [];
  return scans.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

export async function addScan(scan: Scan) {
  await set("scans", [...(await listScans()), scan]);
}

export async function deleteScan(id: string) {
  await set(
    "scans",
    (await listScans()).filter((s) => s.id !== id),
  );
}

export const listTryOns = async () => (await get<SavedTryOn[]>("tryons")) ?? [];
export async function addTryOn(t: SavedTryOn) {
  await set("tryons", [t, ...(await listTryOns())].slice(0, 24));
}

export const resetAll = () => clear();

export function levelsOf(scan: Scan): Record<ConcernId, number> {
  return Object.fromEntries(CONCERN_IDS.map((id) => [id, scan.analysis.concerns[id]?.level ?? NaN])) as Record<
    ConcernId,
    number
  >;
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- demo journey (synthetic, clearly labelled) ----------

// A made-up patient starting an EGFR inhibitor. Shapes follow the timing
// reported in the literature (rash starts in weeks 1-3, peaks weeks 3-4),
// but every number here is synthetic.
export async function seedDemo() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 38);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const base: Record<ConcernId, number> = {
    redness: 22,
    acne: 12,
    moisture: 34,
    age_spot: 18,
    texture: 26,
    oiliness: 30,
    radiance: 28,
    dark_circle_v2: 25,
  };
  // Day offsets from treatment start and the rise applied to each concern.
  const plan: { day: number; kind: Scan["kind"]; rise: Partial<Record<ConcernId, number>>; symptoms?: SymptomId[] }[] = [
    { day: -3, kind: "baseline", rise: {} },
    { day: -2, kind: "baseline", rise: {} },
    { day: -1, kind: "baseline", rise: {} },
    { day: 4, kind: "checkin", rise: { moisture: 1 } },
    { day: 8, kind: "checkin", rise: { acne: 2, redness: 2, moisture: 3 } },
    { day: 12, kind: "checkin", rise: { acne: 7, redness: 5, moisture: 4 }, symptoms: ["itch"] },
    { day: 16, kind: "checkin", rise: { acne: 12, redness: 8, moisture: 6, texture: 4 }, symptoms: ["itch", "dry"] },
    { day: 20, kind: "checkin", rise: { acne: 15, redness: 10, moisture: 8, texture: 5 }, symptoms: ["itch", "dry"] },
    { day: 24, kind: "checkin", rise: { acne: 16, redness: 11, moisture: 7, texture: 5 }, symptoms: ["dry"] },
    { day: 29, kind: "checkin", rise: { acne: 11, redness: 8, moisture: 5, age_spot: 3 }, symptoms: ["dry"] },
    { day: 34, kind: "checkin", rise: { acne: 8, redness: 6, moisture: 4, age_spot: 5 } },
  ];
  // Small deterministic wobble so the lines look like real measurements.
  const wobble = (i: number, j: number) => Math.round(Math.sin(i * 7.3 + j * 3.1) * 12) / 10;

  const scans: Scan[] = plan.map((p, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + p.day);
    d.setHours(9, 0, 0, 0);
    const concerns = Object.fromEntries(
      CONCERN_IDS.map((id, j) => {
        const level = base[id] + (p.rise[id] ?? 0) + wobble(i, j);
        return [id, { raw: Math.round((100 - level) * 10) / 10, level: concernLevel(100 - level) }];
      }),
    ) as SkinAnalysis["concerns"];
    return {
      id: newId(),
      takenAt: d.toISOString(),
      kind: p.kind,
      analysis: { concerns, mode: "mock", analyzedAt: d.toISOString() },
      symptoms: p.symptoms ?? [],
      demo: true,
    };
  });

  await clear();
  await saveProfile({ name: "Demo patient", treatment: "egfr", cycleLength: 28, firstCycleStart: iso(start), demo: true });
  await set("scans", scans);
}
