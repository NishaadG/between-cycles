import { checkIngredients, type CheckResult } from "./ingredients";

// Runs the cited ingredient rules over a catalogue of real products. The
// same audit serves two readers: a patient looking for a gentle product,
// and a pharmacy or retailer asking how much of a shelf suits people in
// treatment.

export interface CatalogProduct {
  code: string;
  name: string;
  brand: string;
  category: string;
  ingredients: string;
  image?: string;
}

export interface CategoryAudit {
  id: string;
  label: string;
  total: number;
  ok: number;
  caution: number;
  avoid: number;
  // How many products each flagged rule appears in, most common first.
  flags: { id: string; name: string; count: number }[];
}

export interface Pick {
  product: CatalogProduct;
  result: CheckResult;
  // Helpful ingredients (humectants, SPF) found, used for ranking.
  helpful: string[];
}

export const productUrl = (code: string) => `https://world.openbeautyfacts.org/product/${encodeURIComponent(code)}`;

export function auditCategory(id: string, label: string, products: CatalogProduct[]): CategoryAudit {
  const inCat = products.filter((p) => p.category === id);
  const counts = { ok: 0, caution: 0, avoid: 0 };
  const flags = new Map<string, { id: string; name: string; count: number }>();
  for (const p of inCat) {
    const r = checkIngredients(p.ingredients);
    counts[r.overall]++;
    for (const f of r.findings) {
      if (f.rule.verdict === "helpful") continue;
      const cur = flags.get(f.rule.id) ?? { id: f.rule.id, name: f.rule.name, count: 0 };
      cur.count++;
      flags.set(f.rule.id, cur);
    }
  }
  return {
    id,
    label,
    total: inCat.length,
    ...counts,
    flags: [...flags.values()].sort((a, b) => b.count - a.count),
  };
}

// Products with no avoid or caution flags, those with helpful ingredients
// first. Nothing here is an endorsement: it is what the rules found.
export function picks(category: string, products: CatalogProduct[], limit = 12): Pick[] {
  return products
    .filter((p) => p.category === category)
    .map((product) => {
      const result = checkIngredients(product.ingredients);
      const helpful = result.findings.filter((f) => f.rule.verdict === "helpful").map((f) => f.rule.name);
      return { product, result, helpful };
    })
    .filter((p) => p.result.overall === "ok")
    .sort((a, b) => b.helpful.length - a.helpful.length || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);
}
