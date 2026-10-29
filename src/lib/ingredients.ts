import type { SourceId } from "./sources";

// Rule-based ingredient check. Deliberately not an AI model: every flag is
// a fixed rule that cites published patient guidance, so the same label
// always gets the same answer and the reason can be shown.

export type Verdict = "avoid" | "caution" | "helpful";

export interface Rule {
  id: string;
  name: string;
  verdict: Verdict;
  // Matched against each normalized ingredient (lowercase, single spaces).
  patterns: RegExp[];
  reason: string;
  sources: SourceId[];
}

export const RULES: Rule[] = [
  {
    id: "benzoyl-peroxide",
    name: "Benzoyl peroxide",
    verdict: "avoid",
    patterns: [/\bbenzoyl peroxide\b/],
    reason:
      "Acne treatments are not meant for treatment-related rash, even though it looks like acne, and can increase dryness and irritation.",
    sources: ["uspharm", "ncoda"],
  },
  {
    id: "salicylic",
    name: "Salicylic acid (BHA)",
    verdict: "avoid",
    patterns: [/\bsalicylic acid\b/, /\bbetaine salicylate\b/, /\bwillow bark\b/],
    reason: "An over-the-counter acne ingredient that can make treatment-related rash drier and more irritated.",
    sources: ["uspharm", "stgeorges"],
  },
  {
    id: "retinoid",
    name: "Retinoids",
    verdict: "avoid",
    patterns: [
      /\bretinol\b/,
      /\bretinal(dehyde)?\b/,
      /\bretinyl (palmitate|acetate|propionate|retinoate)\b/,
      /\btretinoin\b/,
      /\badapalene\b/,
      /\btazarotene\b/,
      /\bhydroxypinacolone retinoate\b/,
    ],
    reason: "Retinoids dry the skin and are advised against during this kind of rash.",
    sources: ["uspharm"],
  },
  {
    id: "anesthetic",
    name: "Numbing agents (benzocaine, lidocaine)",
    verdict: "avoid",
    patterns: [/\bbenzocaine\b/, /\blidocaine\b/],
    reason: "Benzocaine can cause sensitivity reactions; lidocaine overuse carries a risk of side effects. Ask your team first.",
    sources: ["uspharm"],
  },
  {
    id: "fragrance",
    name: "Fragrance",
    verdict: "avoid",
    patterns: [
      /\b(parfum|fragrance|perfume|aroma)\b/,
      /\b(linalool|limonene|citronellol|geraniol|eugenol|isoeugenol|coumarin|citral|cinnamal|hexyl cinnamal|farnesol|benzyl salicylate|benzyl benzoate|amyl cinnamal|hydroxycitronellal)\b/,
      /\bessential oil\b/,
    ],
    reason: "Fragranced products may irritate skin that is already sensitive from treatment.",
    sources: ["stgeorges", "macmillan"],
  },
  {
    id: "drying-alcohol",
    name: "Drying alcohol",
    verdict: "avoid",
    // Fatty alcohols (cetyl, cetearyl, stearyl, behenyl...) are moisturising
    // and are deliberately not matched.
    patterns: [/^alcohol( denat\.?)?$/, /\balcohol denat\b/, /\bsd alcohol\b/, /\bethanol\b/, /\bisopropyl alcohol\b/],
    reason: "Products containing alcohol can dry out the skin.",
    sources: ["macmillan"],
  },
  {
    id: "aha",
    name: "Exfoliating acids (AHA)",
    verdict: "caution",
    patterns: [/\bglycolic acid\b/, /\bmandelic acid\b/, /\blactic acid\b/, /\bgluconolactone\b/],
    reason:
      "Guidance is to avoid AHAs if your skin is sensitive. Low amounts in some moisturisers for very dry skin can be fine: ask your team.",
    sources: ["stgeorges"],
  },
  {
    id: "soap",
    name: "Soap base",
    verdict: "caution",
    patterns: [/\bsodium (tallowate|cocoate|palmate|palm kernelate|olivate)\b/, /\bpotassium (cocoate|palmate|oleate)\b/],
    reason: "Soap-based products are likely to make the skin drier. A soap-free cleanser is gentler.",
    sources: ["stgeorges"],
  },
  {
    id: "humectant",
    name: "Hydrating ingredients",
    verdict: "helpful",
    patterns: [/\burea\b/, /\bhyaluronic acid\b/, /\bsodium hyaluronate\b/, /\bglycerin\b/, /\bshea\b/, /\bbutyrospermum parkii\b/],
    reason: "Urea, hyaluronic acid, shea butter and glycerin are recommended for keeping skin moisturised.",
    sources: ["stgeorges"],
  },
  {
    id: "spf",
    name: "Sunscreen filters",
    verdict: "helpful",
    patterns: [
      /\bzinc oxide\b/,
      /\btitanium dioxide\b/,
      /\b(avobenzone|butyl methoxydibenzoylmethane)\b/,
      /\b(bemotrizinol|bis-ethylhexyloxyphenol methoxyphenyl triazine)\b/,
      /\b(octocrylene|homosalate|octisalate|ethylhexyl salicylate|ethylhexyl triazone|diethylamino hydroxybenzoyl hexyl benzoate)\b/,
    ],
    reason: "Daily broad-spectrum SPF 30-50 is recommended, as many treatments make skin more sun-sensitive.",
    sources: ["stgeorges", "mascc"],
  },
];

export interface Finding {
  rule: Rule;
  matched: string[];
}

export interface CheckResult {
  ingredients: string[];
  findings: Finding[];
  overall: "avoid" | "caution" | "ok";
}

export function parseIngredients(text: string): string[] {
  return text
    .replace(/^\s*(ingredients|inci)\s*[:\-]/i, "")
    .split(/[,;\n•·]|\s\/\s/)
    .map((s) =>
      s
        .toLowerCase()
        .replace(/\*/g, "")
        .replace(/\s+/g, " ")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter((s) => s.length > 1 && s.length < 120);
}

export function checkIngredients(text: string): CheckResult {
  const ingredients = parseIngredients(text);
  const findings: Finding[] = [];
  for (const rule of RULES) {
    const matched = ingredients.filter((ing) => {
      // Salicylates used as sunscreen filters are not the acne acid.
      if (rule.id === "salicylic" && /ethylhexyl salicylate|homosalate|octisalate/.test(ing)) return false;
      // "Benzyl alcohol" is a preservative, not a drying alcohol.
      if (rule.id === "drying-alcohol" && /benzyl alcohol/.test(ing)) return false;
      return rule.patterns.some((p) => p.test(ing));
    });
    if (matched.length) findings.push({ rule, matched });
  }
  const overall = findings.some((f) => f.rule.verdict === "avoid")
    ? "avoid"
    : findings.some((f) => f.rule.verdict === "caution")
      ? "caution"
      : "ok";
  return { ingredients, findings, overall };
}

// Example labels for trying the checker. These are made-up formulas,
// not real products.
export const EXAMPLES: { name: string; text: string }[] = [
  {
    name: "Example: acne spot gel",
    text: "Aqua, Alcohol Denat., Benzoyl Peroxide, Glycerin, Carbomer, Parfum, Limonene, Sodium Hydroxide",
  },
  {
    name: "Example: night serum",
    text: "Aqua, Squalane, Retinol, Glycolic Acid, Niacinamide, Phenoxyethanol, Linalool",
  },
  {
    name: "Example: barrier cream",
    text: "Aqua, Glycerin, Cetearyl Alcohol, Urea, Petrolatum, Ceramide NP, Sodium Hyaluronate, Butyrospermum Parkii Butter, Dimethicone, Phenoxyethanol",
  },
  {
    name: "Example: mineral sunscreen SPF 50",
    text: "Aqua, Zinc Oxide, Titanium Dioxide, Caprylic/Capric Triglyceride, Glycerin, Cetyl Alcohol, Tocopherol",
  },
];
