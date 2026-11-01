import { checkIngredients } from "./ingredients";
import { SOURCES } from "./sources";

// The public "gentle during treatment" check, as served to shops' product
// pages by /api/check and drawn by /badge.js. Same rules as the app.

export const BADGE_LABEL = {
  ok: "Gentle during treatment",
  caution: "Ask your care team first",
  avoid: "Not advised during treatment",
} as const;

export const MAX_INGREDIENTS_CHARS = 6000;

export interface BadgeResult {
  verdict: "ok" | "caution" | "avoid";
  label: string;
  summary: string;
  checked: number;
  flags: {
    id: string;
    name: string;
    verdict: "avoid" | "caution";
    reason: string;
    matched: string[];
    sources: { publisher: string; url: string }[];
  }[];
  helpful: { id: string; name: string }[];
  method: string;
  disclaimer: string;
}

export function badgeResult(text: string, origin = ""): BadgeResult {
  const r = checkIngredients(text.slice(0, MAX_INGREDIENTS_CHARS));
  const flags = r.findings
    .filter((f) => f.rule.verdict !== "helpful")
    .map((f) => ({
      id: f.rule.id,
      name: f.rule.name,
      verdict: f.rule.verdict as "avoid" | "caution",
      reason: f.rule.reason,
      matched: f.matched,
      sources: f.rule.sources.map((s) => ({ publisher: SOURCES[s].publisher, url: SOURCES[s].url })),
    }));
  const helpful = r.findings.filter((f) => f.rule.verdict === "helpful").map((f) => ({ id: f.rule.id, name: f.rule.name }));
  const summary =
    r.overall === "ok"
      ? `Nothing on the watch-list in ${r.ingredients.length} ingredients.`
      : `Contains ${flags.map((f) => f.name.toLowerCase().replace(/\((\w+)\)/, (m) => m.toUpperCase())).join(", ")}.`;
  return {
    verdict: r.overall,
    label: BADGE_LABEL[r.overall],
    summary,
    checked: r.ingredients.length,
    flags,
    helpful,
    method: `${origin}/method#products`,
    disclaimer: "Checked against published patient guidance for skin during cancer treatment. Not medical advice.",
  };
}
