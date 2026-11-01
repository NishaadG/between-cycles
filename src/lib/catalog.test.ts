import { describe, expect, it } from "vitest";
import snapshot from "../data/products.json";
import { auditCategory, picks, type CatalogProduct } from "./catalog";

const products = snapshot.products as CatalogProduct[];

describe("catalogue audit", () => {
  it("adds up for every category", () => {
    for (const c of snapshot.categories) {
      const a = auditCategory(c.id, c.label, products);
      expect(a.total).toBeGreaterThan(0);
      expect(a.ok + a.caution + a.avoid).toBe(a.total);
    }
  });

  it("only picks products with no avoid or caution flags", () => {
    for (const c of snapshot.categories) {
      for (const p of picks(c.id, products)) expect(p.result.overall).toBe("ok");
    }
  });

  it("prints the audit", () => {
    const rows = snapshot.categories.map((c) => {
      const a = auditCategory(c.id, c.label, products);
      return { cat: c.label, n: a.total, ok: a.ok, caution: a.caution, avoid: a.avoid, top: a.flags.slice(0, 3).map((f) => `${f.id}:${f.count}`).join(" ") };
    });
    if (process.env.PRINT_AUDIT) console.table(rows);
  });
});
