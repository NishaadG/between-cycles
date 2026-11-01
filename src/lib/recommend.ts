import { concernInfo, type ConcernId } from "./concerns";
import type { SourceId } from "./sources";
import type { CatalogPick } from "./catalog";
import type { Change, Guidance, SymptomId } from "./stats";

// Turns a check-in into product suggestions: what changed -> what patient
// guidance says helps -> real catalogue products that pass every rule and
// contain that kind of ingredient. Fixed logic, no model, no sponsorship.

export interface Need {
  id: "cleanser" | "moisturiser" | "sunscreen";
  title: string;
  // Why this need was triggered, in the person's own numbers.
  because: string[];
  advice: string;
  sources: SourceId[];
  items: (CatalogPick & { why: string })[];
}

interface NeedSpec {
  id: Need["id"];
  title: string;
  advice: string;
  sources: SourceId[];
  categories: string[];
  // A helpful rule the product must match, if any.
  requires?: string;
}

const SPECS: Record<Need["id"], NeedSpec> = {
  cleanser: {
    id: "cleanser",
    title: "A gentle, soap-free cleanser",
    advice: "Wash with lukewarm water and a mild, soap-free cleanser. Acne washes aren't meant for treatment-related rash.",
    sources: ["stgeorges", "uspharm"],
    categories: ["cleansers"],
  },
  moisturiser: {
    id: "moisturiser",
    title: "A fragrance-free moisturiser",
    advice: "Moisturise at least twice a day, while skin is still damp, with an alcohol- and fragrance-free cream.",
    sources: ["stgeorges", "macmillan"],
    categories: ["face-creams", "body-creams"],
    requires: "humectant",
  },
  sunscreen: {
    id: "sunscreen",
    title: "A daily SPF 30–50",
    advice: "Broad-spectrum sunscreen every day: many treatments make skin more sensitive to the sun.",
    sources: ["stgeorges", "mascc"],
    categories: ["sunscreens"],
    requires: "spf",
  },
};

const PER_NEED = 3;

const up = (c: Change) => `${concernInfo(c.id).label} up ${c.delta} points`;

export function recommend(
  changes: Change[] | null,
  symptoms: SymptomId[],
  level: Guidance,
  catalogue: { id: string; picks: CatalogPick[] }[],
): Need[] {
  // Someone who should be calling their team today doesn't need a shop.
  if (level === "urgent") return [];
  const worse = new Map<ConcernId, Change>((changes ?? []).filter((c) => c.status === "worse").map((c) => [c.id, c]));
  const why: Partial<Record<Need["id"], string[]>> = {};
  const add = (id: Need["id"], reason: string) => (why[id] ??= []).push(reason);

  for (const id of ["acne", "redness"] as const) if (worse.has(id)) add("cleanser", up(worse.get(id)!));
  if (worse.has("moisture")) add("moisturiser", up(worse.get("moisture")!));
  if (symptoms.includes("dry")) add("moisturiser", "You reported tight, dry skin");
  if (symptoms.includes("itch")) add("moisturiser", "You reported itching");
  if (worse.has("age_spot")) add("sunscreen", up(worse.get("age_spot")!));

  let order = (["cleanser", "moisturiser", "sunscreen"] as const).filter((id) => why[id]);
  if (!order.length) {
    order = ["moisturiser", "sunscreen"];
    for (const id of order) add(id, "Everyday basics guidance recommends during treatment");
  }

  const used = new Set<string>();
  return order.map((id) => {
    const spec = SPECS[id];
    const pool = spec.categories
      .flatMap((cat) => catalogue.find((c) => c.id === cat)?.picks ?? [])
      .filter((p) => !used.has(p.code))
      .filter((p) => !spec.requires || p.good.some((g) => g.id === spec.requires));
    const score = (p: CatalogPick) => p.good.find((g) => g.id === spec.requires)?.count ?? p.good.length;
    // On ties, prefer a product the person can recognise: a photo and a
    // name in plain Latin letters (the app is in English). Stable sort keeps
    // the catalogue's own order after that.
    const legible = (p: CatalogPick) => (p.image ? 1 : 0) + (/^[ -~]+$/.test(p.name) ? 1 : 0);
    const items = [...pool].sort((a, b) => score(b) - score(a) || legible(b) - legible(a)).slice(0, PER_NEED);
    for (const p of items) used.add(p.code);
    return {
      id,
      title: spec.title,
      because: why[id]!,
      advice: spec.advice,
      sources: spec.sources,
      items: items.map((p) => ({ ...p, why: whyThis(p, spec) })),
    };
  });
}

function whyThis(p: CatalogPick, spec: NeedSpec): string {
  const g = p.good.find((x) => x.id === spec.requires);
  const has =
    g?.id === "humectant"
      ? `${g.count} hydrating ingredient${g.count === 1 ? "" : "s"}`
      : g?.id === "spf"
        ? `${g.count} sunscreen filter${g.count === 1 ? "" : "s"}`
        : "no soap base";
  return `${has}; no fragrance, drying alcohol or acne actives`;
}
