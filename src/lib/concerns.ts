// Skin concerns requested from the skin analysis API (SD mode).
// 5-8 concerns cost the same number of units, so we request 8 and
// focus the UI on the four that map to documented treatment side effects.

export type ConcernId =
  | "redness"
  | "acne"
  | "moisture"
  | "age_spot"
  | "texture"
  | "oiliness"
  | "radiance"
  | "dark_circle_v2";

export interface ConcernInfo {
  id: ConcernId;
  label: string;
  // Plain-language reason this concern is tracked during treatment.
  why: string;
  watched: boolean;
}

export const CONCERNS: ConcernInfo[] = [
  {
    id: "redness",
    label: "Redness",
    why: "Inflammation that often comes with treatment-related rash.",
    watched: true,
  },
  {
    id: "acne",
    label: "Bumps & spots",
    why: "Targeted therapies (EGFR inhibitors) commonly cause an acne-like papulopustular rash on the face.",
    watched: true,
  },
  {
    id: "moisture",
    label: "Dryness",
    why: "Dry skin (xerosis) is a frequent side effect of many cancer treatments.",
    watched: true,
  },
  {
    id: "age_spot",
    label: "Dark patches",
    why: "Some chemotherapy drugs cause hyperpigmentation.",
    watched: true,
  },
  { id: "texture", label: "Texture", why: "Roughness and flaking.", watched: false },
  { id: "oiliness", label: "Oiliness", why: "Context for skin type.", watched: false },
  { id: "radiance", label: "Radiance", why: "Overall dullness.", watched: false },
  { id: "dark_circle_v2", label: "Dark circles", why: "Fatigue around the eyes.", watched: false },
];

export const CONCERN_IDS = CONCERNS.map((c) => c.id);
export const WATCHED = CONCERNS.filter((c) => c.watched);

export function concernInfo(id: ConcernId): ConcernInfo {
  return CONCERNS.find((c) => c.id === id)!;
}

// The API's raw_score is 1-100 where higher means healthier-looking skin.
// We display a "concern level" (100 - raw_score) so a rising line means
// the concern is more visible. We never use ui_score: the vendor documents
// it as adjusted upward to be encouraging, which hides change.
export function concernLevel(rawScore: number): number {
  return Math.round((100 - rawScore) * 10) / 10;
}
